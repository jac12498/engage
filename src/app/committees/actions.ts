"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildCommitteeProfile, type CreateCommitteeInput } from "@/lib/committeeProfile"
import { getActiveContext, roleAtLeast } from "@/lib/context"

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
  if (!name) return { ok: false, error: "Committee name is required." }
  const profile = buildCommitteeProfile(input)
  if (!profile.ok) return profile

  const committee = await prisma.committee.create({
    data: {
      name,
      ...profile.data,
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

/**
 * Update the ACTIVE committee's registration profile (name, jurisdiction, state,
 * committee type, filer id). Committee-wide config — admin+ only. Returns to the
 * caller (no redirect) so the settings form can show a saved state in place.
 */
export async function updateActiveCommittee(input: CreateCommitteeInput): Promise<CommitteeResult> {
  const ctx = await getActiveContext()
  if (!ctx) return { ok: false, error: "You must be signed in." }
  if (!roleAtLeast(ctx.role, "admin")) {
    return { ok: false, error: "Only committee admins can change committee settings." }
  }

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Committee name is required." }
  const profile = buildCommitteeProfile(input)
  if (!profile.ok) return profile

  await prisma.committee.update({
    where: { id: ctx.committee.id },
    data: { name, ...profile.data },
  })

  revalidatePath("/", "layout") // committee name shows in the sidebar/switcher
  revalidatePath("/committees")
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
