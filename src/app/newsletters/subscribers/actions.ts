"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"

export type SubscriberResult = { ok: true } | { ok: false; error: string }

/** Active campaign id, editor-gated (subscriber edits are mutations), or null. */
async function requireCommitteeId(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("newsletter:update")) return null
  return ctx.committee.id
}

/** Permanently delete a subscriber (e.g. spam or a bad address). The list is committee-wide. */
export async function deleteSubscriber(subscriberId: string): Promise<SubscriberResult> {
  const committeeId = await requireCommitteeId()
  if (!committeeId) return { ok: false, error: "You must be signed in." }

  const sub = await prisma.newsletterSubscriber.findFirst({
    where: { id: subscriberId, committeeId },
    select: { id: true },
  })
  if (!sub) return { ok: false, error: "Subscriber not found." }

  await prisma.newsletterSubscriber.delete({ where: { id: sub.id } })
  revalidatePath("/newsletters/subscribers")
  return { ok: true }
}
