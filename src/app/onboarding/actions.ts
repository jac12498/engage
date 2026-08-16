"use server"

import { redirect } from "next/navigation"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSupportedState, isValidCommitteeType } from "@/lib/committeeTypes"

export interface CreateCommitteeInput {
  /** Committee name, e.g. "Woodstock Democratic Committee". */
  name: string
  /** 2-letter state whose committee rules apply (NY supported today). */
  state: string
  /** Committee-type code from the state's list (see lib/committeeTypes). */
  committeeType: string
  /** Optional state campaign-finance Filer ID (NY BOE). No auto-lookup yet. */
  filerId?: string
}

export type OnboardingResult = { ok: true } | { ok: false; error: string }

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
  const state = input.state.trim().toUpperCase()
  const committeeType = input.committeeType.trim()
  const filerId = input.filerId?.trim() || null

  if (!name) return { ok: false, error: "Committee name is required." }
  if (!isSupportedState(state)) return { ok: false, error: "Please choose a supported state." }
  if (!isValidCommitteeType(state, committeeType)) {
    return { ok: false, error: "Please choose a committee type." }
  }

  // Already set up? (Idempotent: a user who belongs to a committee is done.)
  const existingMembership = await prisma.committeeMembership.findFirst({
    where: { userId },
    select: { committeeId: true },
  })
  if (existingMembership) return { ok: true }

  const committee = await prisma.committee.create({
    data: {
      name,
      state,
      committeeType,
      filerId,
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
