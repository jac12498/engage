import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { toPlanId } from "@/lib/entitlements"
import { mediumAllowed, type Medium } from "@/lib/comms/prompts"

function usedThisMonth(used: number, periodStart: Date): number {
  const now = new Date()
  const sameMonth =
    periodStart.getUTCFullYear() === now.getUTCFullYear() &&
    periodStart.getUTCMonth() === now.getUTCMonth()
  return sameMonth ? used : 0
}

/** Load everything a media generator page needs for one medium. */
export async function loadMediumData(medium: Medium) {
  const { campaign: active, committee } = await requireActiveCampaign()

  // A multi-candidate committee doesn't do speeches — guard the route.
  if (!mediumAllowed(medium, allowsMultipleCandidates(committee.committeeType))) {
    redirect("/communications")
  }

  // Topics are committee-level grounding; generations belong to the active run.
  const [topics, generations] = await Promise.all([
    prisma.topic.findMany({ where: { committeeId: committee.id }, orderBy: { updatedAt: "desc" } }),
    prisma.generation.findMany({
      where: { campaignId: active.id, medium },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ])

  return {
    plan: toPlanId(committee.plan),
    creditsUsed: usedThisMonth(committee.creditsThisMonth, committee.billingPeriodStart),
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      keyMessage: t.keyMessage,
      targetAudience: t.targetAudience,
      occasion: t.occasion,
      talkingPoints: t.talkingPoints,
    })),
    generations: generations.map((g) => ({
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
