"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export type SignupResult = { ok: true; contactId?: string } | { ok: false; error: string }

/** Resolve the signed-in user's campaign id, or null. */
async function requireCampaignId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return campaign?.id ?? null
}

/** Load a signup only if it belongs to the caller's campaign (via its website). */
async function loadOwnedSignup(signupId: string, campaignId: string) {
  return prisma.volunteerSignup.findFirst({
    where: { id: signupId, website: { campaignId } },
  })
}

/** "Jane Q. Public" -> { firstName: "Jane", lastName: "Q. Public" }. */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "Unknown", lastName: "" }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

/**
 * Accept a pending signup: create a Contact, or merge into an existing one that
 * already has this email in the campaign (dedupe). Marks the signup accepted and
 * links it to the resulting Contact.
 */
export async function acceptSignup(signupId: string): Promise<SignupResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const signup = await loadOwnedSignup(signupId, campaignId)
  if (!signup) return { ok: false, error: "Signup not found." }
  if (signup.status === "accepted" && signup.contactId) {
    return { ok: true, contactId: signup.contactId }
  }

  const email = signup.email.trim()
  const phone = signup.phone?.trim() || null
  const noteBody = signup.message?.trim()
    ? `Volunteered via the website: "${signup.message.trim()}"`
    : "Signed up to volunteer via the website."

  // Dedupe: an existing contact with this email (case-insensitive) in the campaign.
  const existing = email
    ? await prisma.contact.findFirst({
        where: {
          campaignId,
          emails: { some: { email: { equals: email, mode: "insensitive" } } },
        },
        include: { phones: true },
      })
    : null

  let contactId: string

  if (existing) {
    // Merge: ensure "volunteer" type, add the phone if new, append a note.
    const types = existing.types.includes("volunteer")
      ? existing.types
      : [...existing.types, "volunteer"]
    const phoneIsNew =
      phone && !existing.phones.some((p) => p.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""))

    await prisma.contact.update({
      where: { id: existing.id },
      data: {
        types,
        ...(phoneIsNew
          ? { phones: { create: { label: "Mobile", phone, order: existing.phones.length } } }
          : {}),
        contactNotes: { create: { body: noteBody } },
      },
    })
    contactId = existing.id
  } else {
    const { firstName, lastName } = splitName(signup.name)
    const created = await prisma.contact.create({
      data: {
        campaignId,
        firstName,
        lastName,
        types: ["volunteer"],
        source: "volunteer_signup",
        emails: email ? { create: { label: "Personal", email, order: 0 } } : undefined,
        phones: phone ? { create: { label: "Mobile", phone, order: 0 } } : undefined,
        contactNotes: { create: { body: noteBody } },
      },
    })
    contactId = created.id
  }

  await prisma.volunteerSignup.update({
    where: { id: signup.id },
    data: { status: "accepted", reviewedAt: new Date(), contactId },
  })

  revalidatePath("/contacts")
  revalidatePath("/contacts/signups")
  return { ok: true, contactId }
}

/** Reject a signup (kept for audit; no Contact created). */
export async function rejectSignup(signupId: string): Promise<SignupResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const signup = await loadOwnedSignup(signupId, campaignId)
  if (!signup) return { ok: false, error: "Signup not found." }

  await prisma.volunteerSignup.update({
    where: { id: signup.id },
    data: { status: "rejected", reviewedAt: new Date() },
  })

  revalidatePath("/contacts/signups")
  return { ok: true }
}

/** Permanently delete a signup record. */
export async function deleteSignup(signupId: string): Promise<SignupResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const signup = await loadOwnedSignup(signupId, campaignId)
  if (!signup) return { ok: false, error: "Signup not found." }

  await prisma.volunteerSignup.delete({ where: { id: signup.id } })
  revalidatePath("/contacts/signups")
  return { ok: true }
}
