"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Core campaign identity fields editable after signup. */
export interface CampaignBasicsInput {
  candidateName: string
  office: string
  party?: string
  committeeName?: string
  mailingAddress?: string
}

export type UpdateResult = { ok: true } | { ok: false; error: string }

/**
 * Update the signed-in user's core campaign identity (name, office, party,
 * committee). District/voter-file link is snapshotted at onboarding and edited
 * separately — not touched here.
 */
export async function updateCampaignBasics(
  input: CampaignBasicsInput
): Promise<UpdateResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "You must be signed in." }

  const candidateName = input.candidateName.trim()
  const office = input.office.trim()
  if (!candidateName) return { ok: false, error: "Candidate name is required." }
  if (!office) return { ok: false, error: "Office is required." }

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) return { ok: false, error: "No campaign found." }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      candidateName,
      office,
      party: input.party?.trim() || null,
      committeeName: input.committeeName?.trim() || null,
      mailingAddress: input.mailingAddress?.trim() || null,
    },
  })

  // Both the workspace header and any published website read these fields.
  revalidatePath("/dashboard")
  revalidatePath("/settings")
  revalidatePath(`/websites/${campaign.id}`)
  return { ok: true }
}
