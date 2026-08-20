import { prisma } from "@/lib/prisma"
import { getActiveContext, campaignProfile } from "@/lib/context"
import { anthropic } from "@/lib/comms/anthropic"
import { buildSystemPrompt, buildRevisionPrompt, draftingThinking, isContentType, toContextBundle } from "@/lib/comms/prompts"
import { toPlanId, resolveModel } from "@/lib/entitlements"
import { consumeRevision } from "@/lib/comms/usage"

export async function POST(req: Request) {
  const ctx = await getActiveContext()
  if (!ctx) return new Response("Unauthorized", { status: 401 })

  const body = (await req.json()) as {
    type?: string
    currentDraft?: string
    notes?: string
    topicId?: string | null
    model?: string | null
  }

  if (!body.type || !isContentType(body.type)) {
    return new Response("Invalid content type", { status: 400 })
  }
  if (!body.currentDraft?.trim()) return new Response("Nothing to revise", { status: 400 })
  if (!body.notes?.trim()) return new Response("Revision notes required", { status: 400 })

  const { committee, campaign, candidate } = ctx
  if (!campaign || !candidate) return new Response("No campaign found", { status: 404 })
  const profile = campaignProfile(candidate, campaign)

  const plan = toPlanId(committee.plan)

  const usedModel = resolveModel(body.model ?? committee.aiModel)

  // Revisions are ~free: only every Nth one charges (at the model's cost, capped).
  const consumed = await consumeRevision(plan, committee, usedModel)
  if (!consumed.ok) {
    return Response.json(
      { error: "limit_reached", used: consumed.used, limit: consumed.limit },
      { status: 429 }
    )
  }

  // Same scope-based context as generation: general + the piece's topic.
  const contextItems = await prisma.contextItem.findMany({
    where: {
      campaignId: campaign.id,
      OR: [{ topicId: null }, ...(body.topicId ? [{ topicId: body.topicId }] : [])],
    },
    orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  })

  const systemPrompt = buildSystemPrompt(profile, toContextBundle(contextItems))
  const userPrompt = buildRevisionPrompt(body.type, body.currentDraft, body.notes)

  const thinking = draftingThinking(usedModel)
  const stream = await anthropic.messages.create({
    model: usedModel,
    max_tokens: 2048,
    ...(thinking ? { thinking } : {}),
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Model": usedModel,
      "X-Credits-Used": String(consumed.used),
      "X-Charged": consumed.charged ? "1" : "0",
    },
  })
}
