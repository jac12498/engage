"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"

/** Core campaign identity fields editable after signup. */
export interface CampaignBasicsInput {
  candidateName: string
  office: string
  party: string
  committeeName: string
  // Candidate assets (durable across runs).
  slogan?: string
  website?: string
  actblueUrl?: string
  mailingStreet?: string
  mailingStreet2?: string
  mailingCity?: string
  mailingState?: string
  mailingZip?: string
}

export type UpdateResult = { ok: true } | { ok: false; error: string }

/**
 * Update the signed-in user's core campaign identity (name, office, primary party,
 * committee, mailing address). Fusion endorsements are per-run and edited on Campaign
 * settings; the district/voter-file link is snapshotted at onboarding — neither is
 * touched here.
 */
export async function updateCampaignBasics(
  input: CampaignBasicsInput
): Promise<UpdateResult> {
  const ctx = await getActiveContext()
  if (!ctx?.campaign || !ctx.candidate) return { ok: false, error: "You must be signed in." }
  // Campaign settings (the candidate profile) feed both Communications and the
  // Website, so update on either module is enough to edit them.
  if (!ctx.permissions.has("ai-communications:update") && !ctx.permissions.has("candidate-websites:update")) {
    return { ok: false, error: "You don't have permission to edit candidate settings." }
  }

  const candidateName = input.candidateName.trim()
  const office = input.office.trim()
  const party = input.party.trim()
  const committeeName = input.committeeName.trim()
  if (!candidateName) return { ok: false, error: "Candidate name is required." }
  if (!office) return { ok: false, error: "Office is required." }
  if (!party) return { ok: false, error: "Party is required." }
  if (!committeeName) return { ok: false, error: "Committee name is required." }

  const { candidate, campaign } = ctx

  // Person fields + assets live on the Candidate; run fields (office, ballot line,
  // "Paid for by", mailing) live on the active Campaign. Endorsements are managed
  // separately. Slogan reuses `tagline`; website/actblue links are candidate assets.
  await prisma.candidate.update({
    where: { id: candidate.id },
    data: {
      candidateName,
      tagline: input.slogan?.trim() || null,
      website: input.website?.trim() || null,
      actblueUrl: input.actblueUrl?.trim() || null,
    },
  })
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      office,
      party,
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
  revalidatePath(`/websites/${candidate.id}`)
  return { ok: true }
}
