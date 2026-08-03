import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { anthropic } from "@/lib/comms/anthropic"
import { buildSystemPrompt, buildUserPrompt, draftingThinking, isContentType, toContextBundle } from "@/lib/comms/prompts"
import { toPlanId, resolveModel } from "@/lib/entitlements"
import { consumeGeneration } from "@/lib/comms/usage"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const body = (await req.json()) as {
    type?: string
    topicId?: string | null
    newsHook?: string | null
    additionalContext?: string | null
    model?: string | null
  }

  if (!body.type || !isContentType(body.type)) {
    return new Response("Invalid content type", { status: 400 })
  }

  const campaign = await prisma.campaign.findUnique({ where: { userId: session.user.id } })
  if (!campaign) return new Response("No campaign found", { status: 404 })

  const plan = toPlanId(campaign.plan)

  // Resolve the subject before consuming usage so bad requests don't cost a
  // credit. Priority: a Topic, then a freeform hook.
  let issueTopic = ""
  const contextBits: string[] = []

  if (body.topicId) {
    const t = await prisma.topic.findFirst({
      where: { id: body.topicId, campaignId: campaign.id },
    })
    if (t) {
      const tp = t.talkingPoints.length ? ` Talking points: ${t.talkingPoints.join("; ")}.` : ""
      issueTopic = `${t.title}${t.keyMessage ? ` — ${t.keyMessage}` : ""}${tp}`
      if (t.targetAudience) contextBits.push(`Audience: ${t.targetAudience}`)
      if (t.occasion) contextBits.push(`Occasion: ${t.occasion}`)
    }
  }

  if (!issueTopic) issueTopic = body.newsHook ?? ""
  if (!issueTopic.trim()) {
    return new Response("Topic or hook required", { status: 400 })
  }

  if (body.additionalContext?.trim()) contextBits.push(body.additionalContext.trim())
  const additionalContext = contextBits.join(". ")

  const usedModel = resolveModel(body.model ?? campaign.aiModel)

  // Charge the model's credit cost (Starter is capped; overdraft on last credits).
  const consumed = await consumeGeneration(plan, campaign, usedModel)
  if (!consumed.ok) {
    return Response.json(
      { error: "limit_reached", used: consumed.used, limit: consumed.limit },
      { status: 429 }
    )
  }

  // Auto-inject context by scope: general (topicId null) + the selected topic's items.
  const contextItems = await prisma.contextItem.findMany({
    where: {
      campaignId: campaign.id,
      OR: [{ topicId: null }, ...(body.topicId ? [{ topicId: body.topicId }] : [])],
    },
    orderBy: [{ type: "asc" }, { order: "asc" }, { createdAt: "asc" }],
  })

  const systemPrompt = buildSystemPrompt(campaign, toContextBundle(contextItems))
  const userPrompt = buildUserPrompt(body.type, campaign.candidateName, issueTopic, additionalContext)

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
    },
  })
}
