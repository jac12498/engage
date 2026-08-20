"use server"

import { revalidatePath } from "next/cache"
import { auth, updateSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** The active candidate's latest campaign (run), by cycle. */
async function latestCampaignId(candidateId: string): Promise<string | null> {
  const c = await prisma.campaign.findFirst({
    where: { candidateId },
    orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  })
  return c?.id ?? null
}

/**
 * Switch the signed-in user's active committee. Verifies membership, persists the
 * selection to User.lastCommitteeId (and resets the active candidate + campaign to the
 * committee's first candidate and their latest run so the switchers land somewhere
 * valid), then refreshes the session token so the new context takes effect app-wide.
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

  const firstCandidate = await prisma.candidate.findFirst({
    where: { committeeId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  const campaignId = firstCandidate ? await latestCampaignId(firstCandidate.id) : null

  await prisma.user.update({
    where: { id: userId },
    data: { lastCommitteeId: committeeId, lastCandidateId: firstCandidate?.id ?? null, lastCampaignId: campaignId },
  })

  await updateSession({}) // force the jwt callback to re-resolve from the DB
  revalidatePath("/", "layout")
  return { ok: true }
}

/**
 * Switch the active candidate (the person). Verifies the candidate belongs to a
 * committee the user is a member of, then pins them + their latest campaign.
 */
export async function setActiveCandidate(candidateId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false }

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, committee: { members: { some: { userId } } } },
    select: { id: true, committeeId: true },
  })
  if (!candidate) return { ok: false }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastCommitteeId: candidate.committeeId,
      lastCandidateId: candidate.id,
      lastCampaignId: await latestCampaignId(candidate.id),
    },
  })

  await updateSession({})
  revalidatePath("/", "layout")
  return { ok: true }
}

/**
 * Switch the active campaign (a run) under the current candidate. Verifies the
 * campaign belongs to a candidate in a committee the user is a member of, then pins
 * the committee + candidate + campaign together.
 */
export async function setActiveCampaign(campaignId: string): Promise<{ ok: boolean }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { ok: false }

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, candidate: { committee: { members: { some: { userId } } } } },
    select: { id: true, candidateId: true, candidate: { select: { committeeId: true } } },
  })
  if (!campaign) return { ok: false }

  await prisma.user.update({
    where: { id: userId },
    data: {
      lastCommitteeId: campaign.candidate.committeeId,
      lastCandidateId: campaign.candidateId,
      lastCampaignId: campaign.id,
    },
  })

  await updateSession({})
  revalidatePath("/", "layout")
  return { ok: true }
}
