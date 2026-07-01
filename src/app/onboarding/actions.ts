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
  party?: string
  /** Selected district id from public.districts; required. */
  districtId: string
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
  if (!candidateName) return { ok: false, error: "Candidate name is required." }
  if (!office) return { ok: false, error: "Office is required." }
  if (!input.districtId) return { ok: false, error: "Please select a district." }

  // One Campaign per user.
  const existing = await prisma.campaign.findUnique({ where: { userId } })
  if (existing) return { ok: true }

  const district = await getDistrictById(input.districtId)
  if (!district) return { ok: false, error: "That district could not be found." }

  // Derive a state from the district's query_string (districtState=NY). Falls
  // back to null; coverage gating reads this.
  const stateMatch = district.queryString?.match(/districtState=([A-Za-z]{2})/)
  const state = stateMatch ? stateMatch[1].toUpperCase() : null

  await prisma.campaign.create({
    data: {
      userId,
      candidateName,
      office,
      party: input.party?.trim() || null,
      plan: "starter",
      state,
      district: district.name,
      districtId: district.id,
      districtQueryString: district.queryString,
      districtVoterCount: district.voterCount,
    },
  })

  return { ok: true }
}

/** Server-action variant used by the form to create + then route home. */
export async function submitOnboarding(input: CompleteOnboardingInput) {
  const result = await completeOnboarding(input)
  if (result.ok) redirect("/")
  return result
}
