"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isSupportedState, isValidCommitteeType } from "@/lib/committeeTypes"

export interface CreateCommitteeInput {
  name: string
  state: string
  committeeType: string
  filerId?: string
}

export type CommitteeResult = { ok: true } | { ok: false; error: string }

/**
 * Create an ADDITIONAL committee for the signed-in user (they belong to one or more
 * already) and make them its owner. Unlike onboarding's createCommittee, there's no
 * "already has a committee" short-circuit — that's the whole point here. The new
 * committee becomes the active one.
 */
export async function createAdditionalCommittee(
  input: CreateCommitteeInput
): Promise<CommitteeResult> {
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

  // Make the new committee active (it has no campaign yet).
  await prisma.user.update({
    where: { id: userId },
    data: { lastCommitteeId: committee.id, lastCampaignId: null },
  })

  return { ok: true }
}

/** Form variant: create the additional committee, refresh the session, route in. */
export async function submitAdditionalCommittee(input: CreateCommitteeInput) {
  const result = await createAdditionalCommittee(input)
  if (result.ok) {
    await updateSession({}) // pick up the new active committee
    revalidatePath("/", "layout")
    redirect("/dashboard")
  }
  return result
}
