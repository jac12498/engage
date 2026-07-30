import { revalidatePath } from "next/cache"
import type Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic } from "@/lib/comms/anthropic"
import { resolveModel, toPlanId } from "@/lib/entitlements"
import { consumeWebsiteEdit } from "@/lib/comms/usage"
import { WEBSITE_TOOLS, executeTool, describeBlockVocabulary } from "@/lib/website/agentTools"
import { getSiteSnapshot } from "@/lib/website/blockService"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const MAX_TURNS = 12 // safety bound on the tool-use loop per message
const MAX_HISTORY = 20 // prior turns replayed for context

interface ClientTurn {
  role: "user" | "assistant"
  text: string
}

function systemPrompt(
  campaign: { candidateName: string; office: string; party: string | null; state: string | null },
  snapshot: unknown
): string {
  return `You are the conversational website builder for a political candidate's campaign site. You edit the site by calling tools — never claim to have made a change you didn't make with a tool.

CANDIDATE
Name: ${campaign.candidateName}
Office: ${campaign.office}${campaign.party ? `\nParty: ${campaign.party}` : ""}${campaign.state ? `\nState: ${campaign.state}` : ""}

HOW THE SITE WORKS
The site is a set of PAGES, each an ordered list of BLOCKS. You change content by adding, editing, moving, and deleting blocks, and by creating/updating pages. Every block has a fixed set of props for its type. To edit a block you replace its full props object, so preserve fields you don't intend to change.

BLOCK VOCABULARY
${describeBlockVocabulary()}

LINKS: use "#volunteer" to link to the volunteer form, "#issues" for the issues section, "#news" for the news feed, an external https URL, or the site's donate link for donations.

GUIDELINES
- Write in the candidate's authentic voice; be concrete, warm, and specific. Never invent biographical facts, endorsements, poll numbers, or policy positions the candidate hasn't stated.
- Prefer editing existing blocks over duplicating them. Keep the home page focused.
- The newsFeed block is dynamic (it lists published AI-Communications pieces) — don't try to add manual items to it.
- Make all the edits the request implies, then STOP and reply with a short, friendly summary of what you changed. Do not ask for confirmation before making a clearly-requested change.

CURRENT SITE (JSON)
${JSON.stringify(snapshot)}`
}

function line(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n")
}

export async function POST(req: Request) {
  try {
    return await handlePost(req)
  } catch (e) {
    // Any throw before the stream is returned (auth, DB, metering, client setup) lands here.
    // Return a readable message so the builder shows the real cause instead of an empty 500.
    console.error("[website/agent] request failed:", e)
    return new Response(e instanceof Error ? e.message : "The builder hit a server error.", {
      status: 500,
    })
  }
}

async function handlePost(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      candidateName: true,
      office: true,
      party: true,
      state: true,
      plan: true,
      aiModel: true,
      creditsThisMonth: true,
      revisionsThisMonth: true,
      crawlsThisMonth: true,
      websiteEditsThisMonth: true,
      newsSearchesThisMonth: true,
      billingPeriodStart: true,
    },
  })
  if (!campaign) return new Response("No campaign", { status: 400 })

  const snapshot0 = await getSiteSnapshot(campaign.id)
  if (!snapshot0) return new Response("No website yet", { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { messages?: ClientTurn[]; model?: string }
  const turns = Array.isArray(body.messages) ? body.messages : []
  if (turns.length === 0 || turns[turns.length - 1]?.role !== "user") {
    return new Response("Expected a trailing user message", { status: 400 })
  }

  // Meter one message per user instruction, before doing any work.
  const plan = toPlanId(campaign.plan)
  const usage = await consumeWebsiteEdit(plan, campaign)
  if (!usage.ok) {
    return Response.json(
      { error: "limit", used: usage.used, limit: usage.limit },
      { status: 429 }
    )
  }

  const model = resolveModel(body.model ?? campaign.aiModel)

  const messages: Anthropic.MessageParam[] = turns
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: t.role, content: t.text }))

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(line(o))
      let mutated = false
      try {
        const system = systemPrompt(campaign, snapshot0)

        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const res = await anthropic.messages.create({
            model,
            max_tokens: 4096,
            system,
            tools: WEBSITE_TOOLS,
            messages,
          })

          messages.push({ role: "assistant", content: res.content })

          const toolUses = res.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
          )

          if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
            const text = res.content
              .filter((b): b is Anthropic.TextBlock => b.type === "text")
              .map((b) => b.text)
              .join("")
              .trim()
            send({ type: "text", text: text || "Done." })
            break
          }

          const results: Anthropic.ToolResultBlockParam[] = []
          for (const tu of toolUses) {
            const outcome = await executeTool(campaign.id, tu.name, (tu.input ?? {}) as Record<string, unknown>)
            if (outcome.mutated) mutated = true
            if (outcome.summary) send({ type: "tool", summary: outcome.summary })
            results.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(outcome.result),
            })
          }
          messages.push({ role: "user", content: results })

          if (turn === MAX_TURNS - 1) {
            send({ type: "text", text: "I made a number of changes — let me know if you'd like more." })
          }
        }

        if (mutated) {
          revalidatePath("/website")
          revalidatePath("/website/preview")
          revalidatePath(`/websites/${campaign.id}`)
        }
        send({ type: "done", used: usage.used, limit: usage.limit, mutated })
      } catch (e) {
        send({ type: "error", error: e instanceof Error ? e.message : "The builder hit an error." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Website-Edits-Used": String(usage.used),
    },
  })
}
