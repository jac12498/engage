import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId } from "@/lib/entitlements"
import { TopicDetail } from "@/components/communications/TopicDetail"

function usedThisMonth(used: number, periodStart: Date): number {
  const now = new Date()
  const sameMonth =
    periodStart.getUTCFullYear() === now.getUTCFullYear() &&
    periodStart.getUTCMonth() === now.getUTCMonth()
  return sameMonth ? used : 0
}

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ topicId: string }>
}) {
  const { topicId } = await params

  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      plan: true,
      creditsThisMonth: true,
      billingPeriodStart: true,
      topics: { orderBy: { title: "asc" }, select: { id: true, title: true } },
    },
  })
  if (!campaign) redirect("/onboarding")

  const topic = await prisma.topic.findFirst({
    where: { id: topicId, campaignId: campaign.id },
    include: {
      contextItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      generations: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  })
  if (!topic) notFound()

  return (
    <TopicDetail
      topic={{
        id: topic.id,
        title: topic.title,
        keyMessage: topic.keyMessage,
        targetAudience: topic.targetAudience,
        occasion: topic.occasion,
        talkingPoints: topic.talkingPoints,
      }}
      topics={campaign.topics}
      contextItems={topic.contextItems.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        body: c.body,
        keyPoints: c.keyPoints,
        url: c.url,
        source: c.source,
        refType: c.refType,
        topicId: c.topicId,
      }))}
      generations={topic.generations.map((g) => ({
        id: g.id,
        type: g.type,
        title: g.title,
        content: g.content,
        model: g.model,
        newsHook: g.newsHook,
        createdAt: g.createdAt.toISOString(),
      }))}
      plan={toPlanId(campaign.plan)}
      creditsUsed={usedThisMonth(campaign.creditsThisMonth, campaign.billingPeriodStart)}
    />
  )
}
