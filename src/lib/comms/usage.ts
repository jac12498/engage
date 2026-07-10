import "server-only"
import { prisma } from "@/lib/prisma"
import { CREDIT_LIMITS, WEBSITE_CRAWL_LIMITS, creditCost, type PlanId } from "@/lib/entitlements"

/** How many revisions equal one charged credit event. */
export const REVISIONS_PER_CREDIT = 5

export type ConsumeResult =
  | { ok: true; used: number; limit: number | null; charged: boolean }
  | { ok: false; used: number; limit: number }

interface UsageCampaign {
  id: string
  creditsThisMonth: number
  revisionsThisMonth: number
  crawlsThisMonth: number
  billingPeriodStart: Date
}

interface MonthState {
  credits: number
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
    credits: sameMonth ? campaign.creditsThisMonth : 0,
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
      creditsThisMonth: s.credits,
      revisionsThisMonth: s.revisions,
      crawlsThisMonth: s.crawls,
      billingPeriodStart: s.periodStart,
    },
  })
}

/**
 * Add `cost` credits to the running total, capped at the plan limit so a user
 * can never be charged past zero balance. On limited plans this is the
 * "spend your last credits on any model" overdraft: a user with 4 credits left
 * can still run Opus (cost 5) — they're charged only the 4 they have. Unlimited
 * plans just accumulate for record-keeping.
 */
function applyCharge(s: MonthState, limit: number | null, cost: number) {
  s.credits = limit != null ? Math.min(limit, s.credits + cost) : s.credits + cost
}

/** Charge a fresh generation's credit cost (by model). */
export async function consumeGeneration(
  plan: PlanId,
  campaign: UsageCampaign,
  model: string
): Promise<ConsumeResult> {
  const limit = CREDIT_LIMITS[plan]
  const s = monthlyState(campaign)
  // Reject only when the balance is already exhausted — never mid-generation.
  if (limit != null && s.credits >= limit) return { ok: false, used: s.credits, limit }

  applyCharge(s, limit, creditCost(model))
  await writeUsage(campaign.id, s)
  return { ok: true, used: s.credits, limit, charged: true }
}

/**
 * Account for one revision. Only every Nth revision (REVISIONS_PER_CREDIT)
 * charges credits, at the model's per-generation cost, subject to the cap.
 */
export async function consumeRevision(
  plan: PlanId,
  campaign: UsageCampaign,
  model: string
): Promise<ConsumeResult> {
  const limit = CREDIT_LIMITS[plan]
  const s = monthlyState(campaign)

  s.revisions += 1
  const charges = s.revisions % REVISIONS_PER_CREDIT === 0
  if (charges && limit != null && s.credits >= limit) {
    return { ok: false, used: s.credits, limit }
  }
  if (charges) applyCharge(s, limit, creditCost(model))

  await writeUsage(campaign.id, s)
  return { ok: true, used: s.credits, limit, charged: charges }
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
