"use server"

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getChildDistricts,
  getDistrictById,
  type DistrictNode,
} from "@/lib/districts"

/** Drill into a district's children (auth-gated wrapper for the picker). */
export async function fetchChildDistricts(parentId: string): Promise<DistrictNode[]> {
  const session = await auth()
  if (!session?.user) return []
  return getChildDistricts(parentId)
}

export interface CompleteOnboardingInput {
  candidateName: string
  office: string
  /** Primary ballot line — required. */
  party: string
  /** Fusion endorsements alongside the primary line, e.g. ["Working Families"]. */
  additionalParties: string[]
  /** Registered campaign committee, e.g. "Friends of Jane Candidate" — required. */
  committeeName: string
  /**
   * Selected district id from public.districts. Optional — voter-file features
   * aren't supported in every state, so a candidate can onboard without one.
   */
  districtId?: string
}

export type OnboardingResult = { ok: true } | { ok: false; error: string }

/**
 * Create the signed-in user's Campaign on the free Starter plan, snapshotting
 * the chosen district (name + query_string + voter_count + derived state) so
 * voter-universe queries never need a cross-schema join later.
 */
export async function completeOnboarding(
  input: CompleteOnboardingInput
): Promise<OnboardingResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "You must be signed in." }
  const userId = session.user.id

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

  // One Campaign per user.
  const existing = await prisma.campaign.findUnique({ where: { userId } })
  if (existing) return { ok: true }

  // District is optional. Voter File, Voter Outreach, and Field Tools are gated
  // by state coverage, but AI Communications + Website work nationwide — so a
  // candidate in an unsupported state can still onboard without picking one.
  let district = null
  if (input.districtId) {
    district = await getDistrictById(input.districtId)
    if (!district) return { ok: false, error: "That district could not be found." }
  }

  // Derive a state from the chosen district's query_string (districtState=NY)
  // when present; null otherwise. Coverage gating reads this.
  const stateMatch = district?.queryString?.match(/districtState=([A-Za-z]{2})/)
  const state = stateMatch ? stateMatch[1].toUpperCase() : null

  await prisma.campaign.create({
    data: {
      userId,
      candidateName,
      office,
      party,
      additionalParties,
      committeeName,
      plan: "starter",
      state,
      district: district?.name ?? null,
      districtId: district?.id ?? null,
      districtQueryString: district?.queryString ?? null,
      districtVoterCount: district?.voterCount ?? null,
    },
  })

  return { ok: true }
}

/** Server-action variant used by the form to create + then route home. */
export async function submitOnboarding(input: CompleteOnboardingInput) {
  const result = await completeOnboarding(input)
  if (result.ok) redirect("/dashboard")
  return result
}
