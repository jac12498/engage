"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type SubscriberResult = { ok: true } | { ok: false; error: string }

async function requireCampaignId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return campaign?.id ?? null
}

/** Permanently delete a subscriber (e.g. spam or a bad address). */
export async function deleteSubscriber(subscriberId: string): Promise<SubscriberResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const sub = await prisma.newsletterSubscriber.findFirst({
    where: { id: subscriberId, campaignId },
    select: { id: true },
  })
  if (!sub) return { ok: false, error: "Subscriber not found." }

  await prisma.newsletterSubscriber.delete({ where: { id: sub.id } })
  revalidatePath("/newsletters/subscribers")
  return { ok: true }
}
