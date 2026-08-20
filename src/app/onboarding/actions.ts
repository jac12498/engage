"use server"

import { redirect } from "next/navigation"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSupportedState, mapCommcandType } from "@/lib/committeeTypes"
import { buildCommitteeProfile, type CreateCommitteeInput } from "@/lib/committeeProfile"
import { fetchCommitteeByFilerId, searchCommitteesByName } from "@/lib/campaignFinance"
import { fetchFecCommittee } from "@/lib/fecCommittees"

export type OnboardingResult = { ok: true } | { ok: false; error: string }

export type FecCommitteeLookup =
  | { found: true; name: string; party: string | null; state: string | null }
  | { found: false }

/** Look up a federal committee by its FEC committee id ("C00…") to prefill onboarding. */
export async function lookupFecCommittee(filerId: string): Promise<FecCommitteeLookup> {
  const session = await auth()
  if (!session?.user?.id) return { found: false }
  const committee = await fetchFecCommittee(filerId)
  if (!committee) return { found: false }
  return { found: true, name: committee.name ?? "", party: committee.party, state: committee.state }
}

export type CommitteeLookup =
  | {
      found: true
      name: string
      committeeTypeCode: string | null // mapped to our onboarding codes, or null
      rawCommitteeType: string | null // the NYSBOE label, for display
      filerType: string | null
      status: string | null
      city: string | null
      addressState: string | null
    }
  | { found: false }

export type CommitteeSearchMatch = {
  filerId: string
  name: string
  committeeTypeCode: string | null // mapped to our onboarding codes, or null
  rawCommitteeType: string | null // the NYSBOE label, for display
  status: string | null
  location: string | null
}

/**
 * Search the committee registry by name (state committees), for people who don't know
 * their Filer ID. Returns client-safe matches the form turns into a pick list; selecting
 * one fills the name, type, and Filer ID. Read-only; requires only a signed-in caller.
 */
export async function searchCommittees(state: string, query: string): Promise<CommitteeSearchMatch[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const stateCode = state.trim().toUpperCase()
  const q = query.trim()
  if (!isSupportedState(stateCode) || q.length < 3) return []

  const matches = await searchCommitteesByName(stateCode, q)
  return matches.map((m) => ({
    filerId: m.committeeId,
    name: m.committeeName,
    committeeTypeCode: mapCommcandType(m.committeeType, m.filerType),
    rawCommitteeType: m.committeeType,
    status: m.status,
    location: [m.city, m.addressState].filter(Boolean).join(", ") || null,
  }))
}

/**
 * Look up a committee by its state Filer ID in the campaign-finance registry
 * (NY only today) to prefill onboarding. Read-only; requires only that the caller
 * is signed in. Returns a plain, client-safe DTO.
 */
export async function lookupCommittee(state: string, filerId: string): Promise<CommitteeLookup> {
  const session = await auth()
  if (!session?.user?.id) return { found: false }

  const stateCode = state.trim().toUpperCase()
  const id = filerId.trim()
  if (!isSupportedState(stateCode) || !id) return { found: false }

  const committee = await fetchCommitteeByFilerId(stateCode, id)
  if (!committee) return { found: false }

  return {
    found: true,
    name: committee.committeeName,
    committeeTypeCode: mapCommcandType(committee.committeeType, committee.filerType),
    rawCommitteeType: committee.committeeType,
    filerType: committee.filerType,
    status: committee.status,
    city: committee.city,
    addressState: committee.addressState,
  }
}

/**
 * Committee-first onboarding: create the signed-in user's Committee on the free
 * Starter plan and make them its owner. Campaigns (candidate races) are added
 * afterward from the workspace — a committee legitimately starts with none.
 */
export async function createCommittee(input: CreateCommitteeInput): Promise<OnboardingResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "You must be signed in." }
  const userId = session.user.id

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Committee name is required." }
  const profile = buildCommitteeProfile(input)
  if (!profile.ok) return profile

  // Already set up? (Idempotent: a user who belongs to a committee is done.)
  const existingMembership = await prisma.committeeMembership.findFirst({
    where: { userId },
    select: { committeeId: true },
  })
  if (existingMembership) return { ok: true }

  const committee = await prisma.committee.create({
    data: {
      name,
      ...profile.data,
      plan: "starter",
      members: { create: { userId, role: "owner" } },
    },
    select: { id: true },
  })

  // Pin the active committee (no campaign yet).
  await prisma.user.update({
    where: { id: userId },
    data: { lastCommitteeId: committee.id, lastCampaignId: null },
  })

  return { ok: true }
}

/** Server-action variant used by the form to create + then route into the workspace. */
export async function submitCommittee(input: CreateCommitteeInput) {
  const result = await createCommittee(input)
  if (result.ok) {
    // Refresh the JWT so it picks up the new active committee; otherwise the
    // dashboard gate would bounce back to onboarding.
    await updateSession({})
    redirect("/dashboard")
  }
  return result
}
