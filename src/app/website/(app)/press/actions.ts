"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext, campaignProfile } from "@/lib/context"
import { toPlanId } from "@/lib/entitlements"
import { consumeNewsSearch } from "@/lib/comms/usage"
import { searchCandidateNews, summarizeArticleUrl } from "@/lib/website/newsSearch"

export type PressResult = { ok: true } | { ok: false; error: string }
export type FindResult =
  | { ok: true; found: number; added: number }
  | { ok: false; error: string; limitHit?: boolean }

/**
 * The active campaign + its committee (for metering), editor-gated. Returns null
 * when not signed in, no active campaign, or insufficient role.
 */
async function requireContext() {
  const ctx = await getActiveContext()
  if (!ctx?.campaign || !ctx.candidate || !ctx.permissions.has("candidate-websites:update")) return null
  return { candidate: ctx.candidate, campaign: ctx.campaign, committee: ctx.committee }
}

function validHttpUrl(v: string): string | null {
  try {
    const u = new URL(v.trim())
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

function revalidatePress(campaignId: string) {
  revalidatePath("/website/press")
  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
}

/**
 * Discover press coverage via web search and file it into the pending review queue.
 * Metered (one search). New articles (by URL) are added as `pending`; already-seen
 * URLs are skipped so re-running doesn't duplicate.
 */
export async function findPressCoverage(keywords?: string): Promise<FindResult> {
  const ctx = await requireContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  const { candidate, campaign, committee } = ctx
  const profile = campaignProfile(candidate, campaign)

  const usage = await consumeNewsSearch(toPlanId(committee.plan), committee)
  if (!usage.ok) {
    return { ok: false, error: "You've used all your news searches this month.", limitHit: true }
  }

  let found
  try {
    found = await searchCandidateNews({
      candidateName: profile.candidateName,
      office: profile.office,
      district: profile.district,
      state: profile.state,
      party: profile.party,
      committeeName: profile.committeeName,
      context: profile.tagline || profile.bio?.slice(0, 400) || profile.whyRunning?.slice(0, 400) || null,
      keywords: typeof keywords === "string" ? keywords.trim().slice(0, 300) || null : null,
    })
  } catch {
    return { ok: false, error: "The news search couldn't complete. Please try again." }
  }

  if (found.length === 0) return { ok: true, found: 0, added: 0 }

  const existing = await prisma.newsClip.findMany({
    where: { campaignId: campaign.id, url: { in: found.map((f) => f.url) } },
    select: { url: true },
  })
  const seen = new Set(existing.map((e) => e.url))
  const fresh = found.filter((f) => !seen.has(f.url))

  if (fresh.length > 0) {
    await prisma.newsClip.createMany({
      data: fresh.map((f) => ({
        campaignId: campaign.id,
        headline: f.headline,
        url: f.url,
        outlet: f.outlet ?? null,
        summary: f.summary ?? null,
        publishedAt: f.publishedAt ? new Date(f.publishedAt) : null,
        source: "web_search",
        status: "pending",
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath("/website/press")
  return { ok: true, found: found.length, added: fresh.length }
}

/**
 * Manually add a press clip by URL: fetch + summarize, then file it as APPROVED
 * (the owner added it deliberately, so it skips the queue). Idempotent per URL.
 */
export async function addPressClipByUrl(rawUrl: string): Promise<PressResult> {
  const ctx = await requireContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  const { campaign } = ctx

  const url = validHttpUrl(rawUrl)
  if (!url) return { ok: false, error: "Enter a valid http(s) link." }

  const article = await summarizeArticleUrl(url)
  if (!article) return { ok: false, error: "Couldn't read that page. Check the link and try again." }

  await prisma.newsClip.upsert({
    where: { campaignId_url: { campaignId: campaign.id, url } },
    create: {
      campaignId: campaign.id,
      headline: article.headline,
      url,
      outlet: article.outlet ?? null,
      summary: article.summary ?? null,
      source: "manual",
      status: "approved",
      reviewedAt: new Date(),
    },
    update: { status: "approved", reviewedAt: new Date() },
  })

  revalidatePress(campaign.id)
  return { ok: true }
}

async function setStatus(clipId: string, status: "approved" | "rejected"): Promise<PressResult> {
  const ctx = await requireContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  const { campaign } = ctx

  const clip = await prisma.newsClip.findFirst({ where: { id: clipId, campaignId: campaign.id } })
  if (!clip) return { ok: false, error: "Clip not found." }

  await prisma.newsClip.update({ where: { id: clip.id }, data: { status, reviewedAt: new Date() } })
  revalidatePress(campaign.id)
  return { ok: true }
}

/** Approve a clip — it appears in the site's "In the news" block. */
export async function approveClip(clipId: string): Promise<PressResult> {
  return setStatus(clipId, "approved")
}

/** Reject a clip — kept for audit; never shown on the site. */
export async function rejectClip(clipId: string): Promise<PressResult> {
  return setStatus(clipId, "rejected")
}

/** Permanently delete a clip. */
export async function deleteClip(clipId: string): Promise<PressResult> {
  const ctx = await requireContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  const { campaign } = ctx

  const clip = await prisma.newsClip.findFirst({ where: { id: clipId, campaignId: campaign.id } })
  if (!clip) return { ok: false, error: "Clip not found." }

  await prisma.newsClip.delete({ where: { id: clip.id } })
  revalidatePress(campaign.id)
  return { ok: true }
}
