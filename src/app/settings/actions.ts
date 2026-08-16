"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast } from "@/lib/context"

/** Core campaign identity fields editable after signup. */
export interface CampaignBasicsInput {
  candidateName: string
  office: string
  party: string
  additionalParties: string[]
  committeeName: string
  mailingStreet?: string
  mailingStreet2?: string
  mailingCity?: string
  mailingState?: string
  mailingZip?: string
}

export type UpdateResult = { ok: true } | { ok: false; error: string }

/**
 * Update the signed-in user's core campaign identity (name, office, party +
 * endorsements, committee, mailing address). District/voter-file link is
 * snapshotted at onboarding and edited separately — not touched here.
 */
export async function updateCampaignBasics(
  input: CampaignBasicsInput
): Promise<UpdateResult> {
  const ctx = await getActiveContext()
  if (!ctx?.campaign) return { ok: false, error: "You must be signed in." }
  if (!roleAtLeast(ctx.role, "editor")) return { ok: false, error: "You don't have permission to edit campaign settings." }

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

  const campaign = ctx.campaign

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      candidateName,
      office,
      party,
      additionalParties,
      committeeName,
      mailingStreet: input.mailingStreet?.trim() || null,
      mailingStreet2: input.mailingStreet2?.trim() || null,
      mailingCity: input.mailingCity?.trim() || null,
      mailingState: input.mailingState?.trim() || null,
      mailingZip: input.mailingZip?.trim() || null,
    },
  })

  // Both the workspace header and any published website read these fields.
  revalidatePath("/dashboard")
  revalidatePath("/settings")
  revalidatePath(`/websites/${campaign.id}`)
  return { ok: true }
}
