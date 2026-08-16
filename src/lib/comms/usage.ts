import "server-only"
import { prisma } from "@/lib/prisma"
import {
  CREDIT_LIMITS,
  WEBSITE_CRAWL_LIMITS,
  WEBSITE_EDIT_LIMITS,
  NEWS_SEARCH_LIMITS,
  NEWSLETTER_EMAIL_LIMITS,
  creditCost,
  type PlanId,
} from "@/lib/entitlements"

/** How many revisions equal one charged credit event. */
export const REVISIONS_PER_CREDIT = 5

export type ConsumeResult =
  | { ok: true; used: number; limit: number | null; charged: boolean }
  | { ok: false; used: number; limit: number }

// Usage is metered at the COMMITTEE level: a committee has one shared monthly pool
// across all of its campaigns. The counter fields live on the Committee row.
interface UsageCommittee {
  id: string
  creditsThisMonth: number
  revisionsThisMonth: number
  crawlsThisMonth: number
  websiteEditsThisMonth: number
  newsSearchesThisMonth: number
  newsletterEmailsThisMonth: number
  billingPeriodStart: Date
}

interface MonthState {
  credits: number
  revisions: number
  crawls: number
  websiteEdits: number
  newsSearches: number
  newsletterEmails: number
  periodStart: Date
}

/** Resolve current-month counters, rolling ALL of them over at a new month. */
function monthlyState(committee: UsageCommittee): MonthState {
  const now = new Date()
  const start = committee.billingPeriodStart
  const sameMonth =
    start.getUTCFullYear() === now.getUTCFullYear() && start.getUTCMonth() === now.getUTCMonth()
  return {
    credits: sameMonth ? committee.creditsThisMonth : 0,
    revisions: sameMonth ? committee.revisionsThisMonth : 0,
    crawls: sameMonth ? committee.crawlsThisMonth : 0,
    websiteEdits: sameMonth ? committee.websiteEditsThisMonth : 0,
    newsSearches: sameMonth ? committee.newsSearchesThisMonth : 0,
    newsletterEmails: sameMonth ? committee.newsletterEmailsThisMonth : 0,
    periodStart: sameMonth ? start : now,
  }
}

// Write all counters so a month-rollover triggered by one consumer also
// resets the others.
function writeUsage(id: string, s: MonthState) {
  return prisma.committee.update({
    where: { id },
    data: {
      creditsThisMonth: s.credits,
      revisionsThisMonth: s.revisions,
      crawlsThisMonth: s.crawls,
      websiteEditsThisMonth: s.websiteEdits,
      newsSearchesThisMonth: s.newsSearches,
      newsletterEmailsThisMonth: s.newsletterEmails,
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
  committee: UsageCommittee,
  model: string
): Promise<ConsumeResult> {
  const limit = CREDIT_LIMITS[plan]
  const s = monthlyState(committee)
  // Reject only when the balance is already exhausted — never mid-generation.
  if (limit != null && s.credits >= limit) return { ok: false, used: s.credits, limit }

  applyCharge(s, limit, creditCost(model))
  await writeUsage(committee.id, s)
  return { ok: true, used: s.credits, limit, charged: true }
}

/**
 * Account for one revision. Only every Nth revision (REVISIONS_PER_CREDIT)
 * charges credits, at the model's per-generation cost, subject to the cap.
 */
export async function consumeRevision(
  plan: PlanId,
  committee: UsageCommittee,
  model: string
): Promise<ConsumeResult> {
  const limit = CREDIT_LIMITS[plan]
  const s = monthlyState(committee)

  s.revisions += 1
  const charges = s.revisions % REVISIONS_PER_CREDIT === 0
  if (charges && limit != null && s.credits >= limit) {
    return { ok: false, used: s.credits, limit }
  }
  if (charges) applyCharge(s, limit, creditCost(model))

  await writeUsage(committee.id, s)
  return { ok: true, used: s.credits, limit, charged: charges }
}

/** Charge one website crawl against the monthly crawl cap. */
export async function consumeCrawl(plan: PlanId, committee: UsageCommittee): Promise<ConsumeResult> {
  const limit = WEBSITE_CRAWL_LIMITS[plan]
  const s = monthlyState(committee)
  if (limit != null && s.crawls >= limit) return { ok: false, used: s.crawls, limit }

  s.crawls += 1
  await writeUsage(committee.id, s)
  return { ok: true, used: s.crawls, limit, charged: true }
}

/**
 * Charge one conversational website-builder message against the monthly cap.
 * Metered per candidate instruction, not per tool call — one message may fan out
 * into several block edits. Rejects only when the balance is already exhausted.
 */
export async function consumeWebsiteEdit(plan: PlanId, committee: UsageCommittee): Promise<ConsumeResult> {
  const limit = WEBSITE_EDIT_LIMITS[plan]
  const s = monthlyState(committee)
  if (limit != null && s.websiteEdits >= limit) return { ok: false, used: s.websiteEdits, limit }

  s.websiteEdits += 1
  await writeUsage(committee.id, s)
  return { ok: true, used: s.websiteEdits, limit, charged: true }
}

/**
 * Charge one "In the News" web-search discovery run against the monthly cap.
 * Metered per search (one instruction = one Claude+web-search call). Rejects only
 * when the balance is already exhausted.
 */
export async function consumeNewsSearch(plan: PlanId, committee: UsageCommittee): Promise<ConsumeResult> {
  const limit = NEWS_SEARCH_LIMITS[plan]
  const s = monthlyState(committee)
  if (limit != null && s.newsSearches >= limit) return { ok: false, used: s.newsSearches, limit }

  s.newsSearches += 1
  await writeUsage(committee.id, s)
  return { ok: true, used: s.newsSearches, limit, charged: true }
}

export type NewsletterHeadroom = { limit: number | null; used: number; remaining: number | null }

/** Read remaining newsletter-email allowance this month (null limit/remaining = unlimited). */
export function newsletterHeadroom(plan: PlanId, committee: UsageCommittee): NewsletterHeadroom {
  const limit = NEWSLETTER_EMAIL_LIMITS[plan]
  const s = monthlyState(committee)
  return {
    limit,
    used: s.newsletterEmails,
    remaining: limit == null ? null : Math.max(0, limit - s.newsletterEmails),
  }
}

/**
 * Reserve `count` recipient-emails against the monthly send allowance. All-or-nothing:
 * rejects if the whole send would exceed the cap (so we never send a partial issue for
 * metering reasons). Charged up front — before the actual Resend calls — so the meter is
 * conservative. Unlimited plans just accumulate for record-keeping.
 */
export async function consumeNewsletterEmails(
  plan: PlanId,
  committee: UsageCommittee,
  count: number
): Promise<ConsumeResult> {
  const limit = NEWSLETTER_EMAIL_LIMITS[plan]
  const s = monthlyState(committee)
  if (limit != null && s.newsletterEmails + count > limit) {
    return { ok: false, used: s.newsletterEmails, limit }
  }
  s.newsletterEmails += count
  await writeUsage(committee.id, s)
  return { ok: true, used: s.newsletterEmails, limit, charged: true }
}

/** Give a crawl credit back (e.g. the crawl found nothing). Best-effort. */
export async function refundCrawl(committeeId: string): Promise<void> {
  const c = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { crawlsThisMonth: true },
  })
  if (c && c.crawlsThisMonth > 0) {
    await prisma.committee.update({
      where: { id: committeeId },
      data: { crawlsThisMonth: c.crawlsThisMonth - 1 },
    })
  }
}
