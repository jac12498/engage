"use server"

import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Switch the signed-in user's active committee. Verifies membership, persists the
 * selection to User.lastCommitteeId (and resets lastCampaignId to the committee's
 * first campaign so the campaign switcher lands somewhere valid), then refreshes
 * the session token so the new context takes effect app-wide.
 */
export async function setActiveCommittee(committeeId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false }

  const membership = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
    select: { committeeId: true },
  })
  if (!membership) return { ok: false }

  const firstCampaign = await prisma.campaign.findFirst({
    where: { committeeId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { lastCommitteeId: committeeId, lastCampaignId: firstCampaign?.id ?? null },
  })

  await updateSession({}) // force the jwt callback to re-resolve from the DB
  revalidatePath("/", "layout")
  return { ok: true }
}

/**
 * Switch the active campaign within the current active committee. Verifies the
 * campaign belongs to a committee the user is a member of, persists it, and
 * refreshes the session.
 */
export async function setActiveCampaign(campaignId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false }

  // The campaign must belong to a committee this user is a member of.
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, committee: { members: { some: { userId } } } },
    select: { id: true, committeeId: true },
  })
  if (!campaign) return { ok: false }

  await prisma.user.update({
    where: { id: userId },
    data: { lastCommitteeId: campaign.committeeId, lastCampaignId: campaign.id },
  })

  await updateSession({})
  revalidatePath("/", "layout")
  return { ok: true }
}
