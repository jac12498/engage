import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId } from "@/lib/entitlements"
import type { Medium } from "@/lib/comms/prompts"

function usedThisMonth(used: number, periodStart: Date): number {
  const now = new Date()
  const sameMonth =
    periodStart.getUTCFullYear() === now.getUTCFullYear() &&
    periodStart.getUTCMonth() === now.getUTCMonth()
  return sameMonth ? used : 0
}

/** Load everything a media generator page needs for one medium. */
export async function loadMediumData(medium: Medium) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    include: {
      topics: { orderBy: { updatedAt: "desc" } },
      generations: { where: { medium }, orderBy: { createdAt: "desc" }, take: 50 },
    },
  })
  if (!campaign) redirect("/onboarding")

  return {
    plan: toPlanId(campaign.plan),
    generationsUsed: usedThisMonth(campaign.generationsThisMonth, campaign.billingPeriodStart),
    topics: campaign.topics.map((t) => ({
      id: t.id,
      title: t.title,
      keyMessage: t.keyMessage,
      targetAudience: t.targetAudience,
      occasion: t.occasion,
      talkingPoints: t.talkingPoints,
    })),
    generations: campaign.generations.map((g) => ({
      id: g.id,
      type: g.type,
      title: g.title,
      content: g.content,
      model: g.model,
      newsHook: g.newsHook,
      createdAt: g.createdAt.toISOString(),
    })),
  }
}
