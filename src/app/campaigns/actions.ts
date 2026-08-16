"use server"

import { redirect } from "next/navigation"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast } from "@/lib/context"
import { getChildDistricts, getDistrictById, type DistrictNode } from "@/lib/districts"

/** Drill into a district's children (auth-gated wrapper for the picker). */
export async function fetchChildDistricts(parentId: string): Promise<DistrictNode[]> {
  const session = await auth()
  if (!session?.user) return []
  return getChildDistricts(parentId)
}

export interface CreateCampaignInput {
  candidateName: string
  office: string
  /** Primary ballot line — required. */
  party: string
  /** Fusion endorsements alongside the primary line, e.g. ["Working Families"]. */
  additionalParties: string[]
  /** Registered campaign committee for the "Paid for by" disclaimer — required. */
  committeeName: string
  /** Selected district id from public.districts. Optional (voter features are state-gated). */
  districtId?: string
}

export type CampaignResult = { ok: true } | { ok: false; error: string }

/**
 * Add a candidate campaign (race) under the active committee. Admins+ only —
 * adding a race is a structural change to the committee. Snapshots the chosen
 * district so voter-universe queries never need a cross-schema join later.
 */
export async function createCampaign(input: CreateCampaignInput): Promise<CampaignResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!roleAtLeast(ctx.role, "admin")) {
    return { ok: false, error: "Only committee owners and admins can add a campaign." }
  }

  const candidateName = input.candidateName.trim()
  const office = input.office.trim()
  const party = input.party.trim()
  const committeeName = input.committeeName.trim()
  if (!candidateName) return { ok: false, error: "Candidate name is required." }
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

  // Derive a 2-letter state from the district's query_string (districtState=NY).
  const stateMatch = district?.queryString?.match(/districtState=([A-Za-z]{2})/)
  const state = stateMatch ? stateMatch[1].toUpperCase() : null

  const campaign = await prisma.campaign.create({
    data: {
      committeeId: ctx.committee.id,
      candidateName,
      office,
      party,
      additionalParties,
      committeeName,
      state,
      district: district?.name ?? null,
      districtId: district?.id ?? null,
      districtQueryString: district?.queryString ?? null,
      districtVoterCount: district?.voterCount ?? null,
    },
    select: { id: true },
  })

  // Make the new campaign the active one.
  await prisma.user.update({
    where: { id: ctx.userId },
    data: { lastCommitteeId: ctx.committee.id, lastCampaignId: campaign.id },
  })

  return { ok: true }
}

/** Server-action variant used by the form to create + then route into the workspace. */
export async function submitCampaign(input: CreateCampaignInput) {
  const result = await createCampaign(input)
  if (result.ok) {
    await updateSession({}) // refresh JWT so the new campaign is the active context
    redirect("/dashboard")
  }
  return result
}
