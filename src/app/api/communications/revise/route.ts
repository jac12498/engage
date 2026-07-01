import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic } from "@/lib/comms/anthropic"
import { buildSystemPrompt, buildRevisionPrompt, isContentType, toContextBundle } from "@/lib/comms/prompts"
import { toPlanId, resolveModel } from "@/lib/entitlements"
import { consumeRevision } from "@/lib/comms/usage"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

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

  const campaign = await prisma.campaign.findUnique({ where: { userId: session.user.id } })
  if (!campaign) return new Response("No campaign found", { status: 404 })

  const plan = toPlanId(campaign.plan)

  // Revisions are ~free: only every Nth one charges a credit (and is capped).
  const consumed = await consumeRevision(plan, campaign)
  if (!consumed.ok) {
    return Response.json(
      { error: "limit_reached", used: consumed.used, limit: consumed.limit },
      { status: 429 }
    )
  }

  const usedModel = resolveModel(plan, body.model ?? campaign.aiModel)

  // Same scope-based context as generation: general + the piece's topic.
  const contextItems = await prisma.contextItem.findMany({
    where: {
      campaignId: campaign.id,
      OR: [{ topicId: null }, ...(body.topicId ? [{ topicId: body.topicId }] : [])],
    },
    orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  })

  const systemPrompt = buildSystemPrompt(campaign, toContextBundle(contextItems))
  const userPrompt = buildRevisionPrompt(body.type, body.currentDraft, body.notes)

  const stream = await anthropic.messages.create({
    model: usedModel,
    max_tokens: 2048,
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
      "X-Generations-Used": String(consumed.used),
      "X-Charged": consumed.charged ? "1" : "0",
    },
  })
}
