"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { getChildDistricts, getDistrictById, type DistrictNode } from "@/lib/districts"

/** Drill into a district's children (auth-gated wrapper for the picker). */
export async function fetchChildDistricts(parentId: string): Promise<DistrictNode[]> {
  const session = await auth()
  if (!session?.user) return []
  return getChildDistricts(parentId)
}

export type CandidateResult = { ok: true } | { ok: false; error: string }

/** The per-run fields a campaign carries (office, ballot line, "Paid for by", district). */
interface RunInput {
  office: string
  party: string
  additionalParties: string[]
  committeeName: string
  filerId?: string
  districtId?: string
}

interface RunFields {
  office: string
  party: string
  additionalParties: string[]
  committeeName: string
  filerId: string | null
  state: string | null
  district: string | null
  districtId: string | null
  districtQueryString: string | null
  districtVoterCount: number | null
}

/** Validate + normalize a run's fields (shared by add-candidate + add-campaign). */
async function buildRunFields(
  input: RunInput,
): Promise<{ ok: true; data: RunFields } | { ok: false; error: string }> {
  const office = input.office.trim()
  const party = input.party.trim()
  const committeeName = input.committeeName.trim()
  if (!office) return { ok: false, error: "Office is required." }
  if (!party) return { ok: false, error: "Party is required." }
  if (!committeeName) return { ok: false, error: "Committee name is required." }

  // Clean endorsements: trim, drop blanks, drop the primary party, de-dupe.
  const seen = new Set<string>([party.toLowerCase()])
  const additionalParties = (input.additionalParties ?? [])
    .map((p) => p.trim())
    .filter((p) => {
      const k = p.toLowerCase()
      if (!p || seen.has(k)) return false
      seen.add(k)
      return true
    })

  // District is optional (voter features are state-gated; Comms + Website are nationwide).
  let district = null
  if (input.districtId) {
    district = await getDistrictById(input.districtId)
    if (!district) return { ok: false, error: "That district could not be found." }
  }
  const stateMatch = district?.queryString?.match(/districtState=([A-Za-z]{2})/)
  const state = stateMatch ? stateMatch[1].toUpperCase() : null

  return {
    ok: true,
    data: {
      office,
      party,
      additionalParties,
      committeeName,
      filerId: input.filerId?.trim() || null,
      state,
      district: district?.name ?? null,
      districtId: district?.id ?? null,
      districtQueryString: district?.queryString ?? null,
      districtVoterCount: district?.voterCount ?? null,
    },
  }
}

// ─── Candidates (the person) ─────────────────────────────────────────────────

export interface CreateCandidateInput extends RunInput {
  candidateName: string
  /** The first run's cycle (election year). Defaults to the current year. */
  cycle?: number
}

/**
 * Add a candidate under the active committee, with their first campaign (a run).
 * Admins+ only. A single-candidate committee is capped at one candidate.
 */
export async function createCandidate(input: CreateCandidateInput): Promise<CandidateResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!ctx.permissions.has("campaigns:manage")) {
    return { ok: false, error: "You don't have permission to add a candidate." }
  }

  // Enforce type-driven cardinality: single-candidate committees hold exactly one.
  if (!allowsMultipleCandidates(ctx.committee.committeeType)) {
    const existing = await prisma.candidate.count({ where: { committeeId: ctx.committee.id } })
    if (existing >= 1) {
      return { ok: false, error: "A single-candidate committee can only have one candidate." }
    }
  }

  const candidateName = input.candidateName.trim()
  if (!candidateName) return { ok: false, error: "Candidate name is required." }
  const run = await buildRunFields(input)
  if (!run.ok) return run

  const candidate = await prisma.candidate.create({
    data: {
      committeeId: ctx.committee.id,
      candidateName,
      campaigns: { create: { cycle: input.cycle ?? new Date().getFullYear(), ...run.data } },
    },
    select: { id: true, campaigns: { select: { id: true } } },
  })

  // Make the new candidate + their first campaign active.
  await prisma.user.update({
    where: { id: ctx.userId },
    data: {
      lastCommitteeId: ctx.committee.id,
      lastCandidateId: candidate.id,
      lastCampaignId: candidate.campaigns[0]?.id ?? null,
    },
  })

  return { ok: true }
}

/** Form variant: create + then route into the workspace. */
export async function submitCandidate(input: CreateCandidateInput) {
  const result = await createCandidate(input)
  if (result.ok) {
    await updateSession({}) // refresh JWT so the new candidate is the active context
    redirect("/dashboard")
  }
  return result
}

/**
 * Permanently remove a candidate from the active committee. Admins+ only. Cascades to
 * all the candidate's campaigns (and their communications/news/newsletter issues) plus
 * the candidate's website. The committee-wide newsletter subscriber list is NOT affected
 * (it belongs to the committee now). Repoints the active context if it was active.
 */
export async function removeCandidate(candidateId: string): Promise<CandidateResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!ctx.permissions.has("campaigns:manage")) {
    return { ok: false, error: "You don't have permission to remove a candidate." }
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, committeeId: ctx.committee.id },
    select: { id: true },
  })
  if (!candidate) return { ok: false, error: "Candidate not found." }

  await prisma.candidate.delete({ where: { id: candidateId } })

  if (ctx.candidate?.id === candidateId) {
    const next = await prisma.candidate.findFirst({
      where: { committeeId: ctx.committee.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { id: true } } },
    })
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { lastCandidateId: next?.id ?? null, lastCampaignId: next?.campaigns[0]?.id ?? null },
    })
    await updateSession({})
  }

  revalidatePath("/candidates")
  revalidatePath("/", "layout")
  return { ok: true }
}

// ─── Campaigns (a run under a candidate) ─────────────────────────────────────

export interface CreateCampaignInput extends RunInput {
  cycle: number
}

/** Add a campaign (run) under the ACTIVE candidate. Admins+ only. */
export async function createCampaign(input: CreateCampaignInput): Promise<CandidateResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!ctx.permissions.has("campaigns:manage")) {
    return { ok: false, error: "You don't have permission to add a campaign." }
  }
  if (!ctx.candidate) return { ok: false, error: "Choose a candidate first." }
  if (!Number.isInteger(input.cycle)) return { ok: false, error: "A valid election year is required." }
  const run = await buildRunFields(input)
  if (!run.ok) return run

  const campaign = await prisma.campaign.create({
    data: { candidateId: ctx.candidate.id, cycle: input.cycle, ...run.data },
    select: { id: true },
  })

  await prisma.user.update({ where: { id: ctx.userId }, data: { lastCampaignId: campaign.id } })
  return { ok: true }
}

/** Form variant: create the campaign + route into the workspace. */
export async function submitCampaign(input: CreateCampaignInput) {
  const result = await createCampaign(input)
  if (result.ok) {
    await updateSession({})
    redirect("/dashboard")
  }
  return result
}

/**
 * Remove a campaign (run) under the active candidate. Admins+ only. Cascades to that
 * run's communications/news/newsletters. Repoints the active campaign if it was active.
 */
export async function removeCampaign(campaignId: string): Promise<CandidateResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!ctx.permissions.has("campaigns:manage")) {
    return { ok: false, error: "You don't have permission to remove a campaign." }
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, candidate: { committeeId: ctx.committee.id } },
    select: { id: true, candidateId: true },
  })
  if (!campaign) return { ok: false, error: "Campaign not found." }

  await prisma.campaign.delete({ where: { id: campaignId } })

  if (ctx.campaign?.id === campaignId) {
    const next = await prisma.campaign.findFirst({
      where: { candidateId: campaign.candidateId },
      orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
      select: { id: true },
    })
    await prisma.user.update({ where: { id: ctx.userId }, data: { lastCampaignId: next?.id ?? null } })
    await updateSession({})
  }

  revalidatePath("/campaigns")
  revalidatePath("/", "layout")
  return { ok: true }
}
