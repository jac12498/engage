"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import type { PermissionKey } from "@/lib/permissions"

export type SignupResult = { ok: true; contactId?: string } | { ok: false; error: string }

/** Resolve the active committee id, requiring a specific privilege, or null. */
async function requireCommitteeIdFor(perm: PermissionKey): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx) return null
  if (!ctx.permissions.has(perm)) return null
  return ctx.committee.id
}

/** Load a signup only if it belongs to the committee (via its website's campaign). */
async function loadOwnedSignup(signupId: string, committeeId: string) {
  return prisma.volunteerSignup.findFirst({
    where: { id: signupId, website: { committeeId } },
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
  const committeeId = await requireCommitteeIdFor("contacts:create")
  if (!committeeId) return { ok: false, error: "You don't have permission to accept signups." }

  const signup = await loadOwnedSignup(signupId, committeeId)
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
          committeeId,
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
        committeeId,
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
  const committeeId = await requireCommitteeIdFor("contacts:update")
  if (!committeeId) return { ok: false, error: "You don't have permission to review signups." }

  const signup = await loadOwnedSignup(signupId, committeeId)
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
  const committeeId = await requireCommitteeIdFor("contacts:delete")
  if (!committeeId) return { ok: false, error: "You don't have permission to delete signups." }

  const signup = await loadOwnedSignup(signupId, committeeId)
  if (!signup) return { ok: false, error: "Signup not found." }

  await prisma.volunteerSignup.delete({ where: { id: signup.id } })
  revalidatePath("/contacts/signups")
  return { ok: true }
}
