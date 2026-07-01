import "server-only"
import { prisma } from "@/lib/prisma"
import { GENERATION_LIMITS, WEBSITE_CRAWL_LIMITS, type PlanId } from "@/lib/entitlements"

/** How many revisions equal one charged generation credit. */
export const REVISIONS_PER_CREDIT = 5

export type ConsumeResult =
  | { ok: true; used: number; limit: number | null; charged: boolean }
  | { ok: false; used: number; limit: number }

interface UsageCampaign {
  id: string
  generationsThisMonth: number
  revisionsThisMonth: number
  crawlsThisMonth: number
  billingPeriodStart: Date
}

interface MonthState {
  generations: number
  revisions: number
  crawls: number
  periodStart: Date
}

/** Resolve current-month counters, rolling ALL of them over at a new month. */
function monthlyState(campaign: UsageCampaign): MonthState {
  const now = new Date()
  const start = campaign.billingPeriodStart
  const sameMonth =
    start.getUTCFullYear() === now.getUTCFullYear() && start.getUTCMonth() === now.getUTCMonth()
  return {
    generations: sameMonth ? campaign.generationsThisMonth : 0,
    revisions: sameMonth ? campaign.revisionsThisMonth : 0,
    crawls: sameMonth ? campaign.crawlsThisMonth : 0,
    periodStart: sameMonth ? start : now,
  }
}

// Write all three counters so a month-rollover triggered by one consumer also
// resets the others.
function writeUsage(id: string, s: MonthState) {
  return prisma.campaign.update({
    where: { id },
    data: {
      generationsThisMonth: s.generations,
      revisionsThisMonth: s.revisions,
      crawlsThisMonth: s.crawls,
      billingPeriodStart: s.periodStart,
    },
  })
}

/** Charge one generation credit (a fresh piece). */
export async function consumeGeneration(
  plan: PlanId,
  campaign: UsageCampaign
): Promise<ConsumeResult> {
  const limit = GENERATION_LIMITS[plan]
  const s = monthlyState(campaign)
  if (limit != null && s.generations >= limit) return { ok: false, used: s.generations, limit }

  s.generations += 1
  await writeUsage(campaign.id, s)
  return { ok: true, used: s.generations, limit, charged: true }
}

/**
 * Account for one revision. Only every Nth revision (REVISIONS_PER_CREDIT)
 * charges a generation credit, which is subject to the monthly cap.
 */
export async function consumeRevision(
  plan: PlanId,
  campaign: UsageCampaign
): Promise<ConsumeResult> {
  const limit = GENERATION_LIMITS[plan]
  const s = monthlyState(campaign)

  s.revisions += 1
  const charges = s.revisions % REVISIONS_PER_CREDIT === 0
  if (charges && limit != null && s.generations >= limit) {
    return { ok: false, used: s.generations, limit }
  }
  if (charges) s.generations += 1

  await writeUsage(campaign.id, s)
  return { ok: true, used: s.generations, limit, charged: charges }
}

/** Charge one website crawl against the monthly crawl cap. */
export async function consumeCrawl(plan: PlanId, campaign: UsageCampaign): Promise<ConsumeResult> {
  const limit = WEBSITE_CRAWL_LIMITS[plan]
  const s = monthlyState(campaign)
  if (limit != null && s.crawls >= limit) return { ok: false, used: s.crawls, limit }

  s.crawls += 1
  await writeUsage(campaign.id, s)
  return { ok: true, used: s.crawls, limit, charged: true }
}

/** Give a crawl credit back (e.g. the crawl found nothing). Best-effort. */
export async function refundCrawl(campaignId: string): Promise<void> {
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { crawlsThisMonth: true },
  })
  if (c && c.crawlsThisMonth > 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { crawlsThisMonth: c.crawlsThisMonth - 1 },
    })
  }
}
