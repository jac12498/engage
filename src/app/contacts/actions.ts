"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import type { PermissionKey } from "@/lib/permissions"
import { validTagSlugs } from "@/lib/committeeTags"
import { getContactFields } from "@/lib/committeeFields"
import { coerceCustomFields } from "@/lib/contactFields"

export interface EmailInput {
  label: string
  email: string
}
export interface PhoneInput {
  label: string
  phone: string
}
export interface AddressInput {
  label: string
  line1: string
  line2?: string
  city?: string
  state?: string
  zip?: string
  lat?: number | null
  lng?: number | null
  placeId?: string | null
}

export interface ContactInput {
  /** When set, update this existing contact instead of creating one. */
  id?: string
  firstName: string
  lastName: string
  /** Zero or more classifications from CONTACT_TYPES. */
  types?: string[]
  /** Labeled emails — label required for each. */
  emails?: EmailInput[]
  /** Labeled phones — label required for each. */
  phones?: PhoneInput[]
  /** Labeled addresses — label + line1 required for each. */
  addresses?: AddressInput[]
  /** Custom field values, keyed by ContactField id. */
  customFields?: Record<string, unknown>
  /** Optional note to append to the history on this save. */
  newNote?: string
}

export type ContactResult = { ok: true; id: string } | { ok: false; error: string }

/**
 * Resolve the active committee id (the CRM is committee-scoped), or null when the
 * user isn't signed in or lacks the required privilege.
 */
async function requireCommitteeIdFor(perm: PermissionKey): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx) return null
  if (!ctx.permissions.has(perm)) return null
  return ctx.committee.id
}

const clean = (v?: string) => v?.trim() || null

/**
 * Normalize + validate the labeled contact-method rows. Rows blank in both
 * fields are dropped; a value without its required label is an error.
 */
function normalizeMethods<T extends { label: string }>(
  rows: (T & { value: string })[],
  noun: string
): { ok: true; rows: { label: string; value: string; order: number }[] } | { ok: false; error: string } {
  const out: { label: string; value: string; order: number }[] = []
  for (const r of rows) {
    const label = r.label?.trim() ?? ""
    const value = r.value?.trim() ?? ""
    if (!label && !value) continue // fully-empty row: ignore
    if (!value) return { ok: false, error: `Please enter the ${noun} or remove the empty row.` }
    if (!label) return { ok: false, error: `Each ${noun} needs a label (e.g. Personal, Work).` }
    out.push({ label, value, order: out.length })
  }
  return { ok: true, rows: out }
}

/**
 * Normalize + validate labeled addresses. Fully-empty rows are dropped; a row
 * with content must have both a label and a street line (line1).
 */
function normalizeAddresses(
  rows: AddressInput[]
):
  | {
      ok: true
      rows: {
        label: string
        line1: string
        line2: string | null
        city: string | null
        state: string | null
        zip: string | null
        lat: number | null
        lng: number | null
        placeId: string | null
        order: number
      }[]
    }
  | { ok: false; error: string } {
  const out = []
  for (const r of rows) {
    const label = r.label?.trim() ?? ""
    const line1 = r.line1?.trim() ?? ""
    const line2 = r.line2?.trim() || null
    const city = r.city?.trim() || null
    const state = r.state?.trim() || null
    const zip = r.zip?.trim() || null
    if (!label && !line1 && !line2 && !city && !state && !zip) continue // empty row
    if (!line1) return { ok: false, error: "Each address needs a street address (line 1)." }
    if (!label) return { ok: false, error: "Each address needs a label (e.g. Home, Mailing)." }
    out.push({
      label,
      line1,
      line2,
      city,
      state,
      zip,
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      placeId: r.placeId?.trim() || null,
      order: out.length,
    })
  }
  return { ok: true, rows: out }
}

/** Create or update a contact (with its emails/phones/addresses), scoped to the caller's campaign. */
export async function saveContact(input: ContactInput): Promise<ContactResult> {
  const committeeId = await requireCommitteeIdFor(input.id ? "contacts:update" : "contacts:create")
  if (!committeeId) return { ok: false, error: "You don't have permission to edit contacts." }

  const firstName = input.firstName?.trim()
  const lastName = input.lastName?.trim()
  if (!firstName) return { ok: false, error: "First name is required." }
  if (!lastName) return { ok: false, error: "Last name is required." }

  const validSlugs = await validTagSlugs(committeeId)
  const types = (input.types ?? []).filter((t) => validSlugs.has(t))

  // Coerce + validate custom field values against the committee's field defs.
  const fieldDefs = await getContactFields(committeeId)
  const customFields = coerceCustomFields(fieldDefs, input.customFields ?? {})

  const emailRes = normalizeMethods(
    (input.emails ?? []).map((e) => ({ label: e.label, value: e.email })),
    "email"
  )
  if (!emailRes.ok) return emailRes
  const phoneRes = normalizeMethods(
    (input.phones ?? []).map((p) => ({ label: p.label, value: p.phone })),
    "phone number"
  )
  if (!phoneRes.ok) return phoneRes
  const addrRes = normalizeAddresses(input.addresses ?? [])
  if (!addrRes.ok) return addrRes

  const newNote = clean(input.newNote)

  const scalar = { firstName, lastName, types, customFields: customFields as Prisma.InputJsonValue }

  const emailCreate = emailRes.rows.map((r) => ({ label: r.label, email: r.value, order: r.order }))
  const phoneCreate = phoneRes.rows.map((r) => ({ label: r.label, phone: r.value, order: r.order }))
  const addressCreate = addrRes.rows

  if (input.id) {
    // Guard: only touch a contact that belongs to this campaign.
    const existing = await prisma.contact.findFirst({
      where: { id: input.id, committeeId },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: "Contact not found." }

    // Replace child collections wholesale; append the optional note.
    await prisma.$transaction([
      prisma.contactEmail.deleteMany({ where: { contactId: input.id } }),
      prisma.contactPhone.deleteMany({ where: { contactId: input.id } }),
      prisma.contactAddress.deleteMany({ where: { contactId: input.id } }),
      prisma.contact.update({
        where: { id: input.id },
        data: {
          ...scalar,
          emails: { create: emailCreate },
          phones: { create: phoneCreate },
          addresses: { create: addressCreate },
          ...(newNote ? { contactNotes: { create: { body: newNote } } } : {}),
        },
      }),
    ])
    revalidatePath("/contacts")
    revalidatePath(`/contacts/${input.id}`)
    return { ok: true, id: input.id }
  }

  const created = await prisma.contact.create({
    data: {
      committeeId,
      source: "manual",
      ...scalar,
      emails: { create: emailCreate },
      phones: { create: phoneCreate },
      addresses: { create: addressCreate },
      ...(newNote ? { contactNotes: { create: { body: newNote } } } : {}),
    },
  })
  revalidatePath("/contacts")
  return { ok: true, id: created.id }
}

/** Append a note to a contact's history. */
export async function addContactNote(
  contactId: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeIdFor("contacts:update")
  if (!committeeId) return { ok: false, error: "You don't have permission to edit contacts." }
  const text = body?.trim()
  if (!text) return { ok: false, error: "Note can't be empty." }

  const existing = await prisma.contact.findFirst({
    where: { id: contactId, committeeId },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "Contact not found." }

  await prisma.contactNote.create({ data: { contactId, body: text } })
  revalidatePath("/contacts")
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}

/** Delete a single note (ownership checked via its contact's campaign). */
export async function deleteContactNote(noteId: string): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeIdFor("contacts:update")
  if (!committeeId) return { ok: false, error: "You don't have permission to edit contacts." }

  const note = await prisma.contactNote.findFirst({
    where: { id: noteId, contact: { committeeId } },
    select: { id: true, contactId: true },
  })
  if (!note) return { ok: false, error: "Note not found." }

  await prisma.contactNote.delete({ where: { id: noteId } })
  revalidatePath("/contacts")
  revalidatePath(`/contacts/${note.contactId}`)
  return { ok: true }
}

/** Delete a contact owned by the caller's campaign. */
export async function deleteContact(id: string): Promise<{ ok: boolean; error?: string }> {
  const committeeId = await requireCommitteeIdFor("contacts:delete")
  if (!committeeId) return { ok: false, error: "You don't have permission to delete contacts." }

  const existing = await prisma.contact.findFirst({
    where: { id, committeeId },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "Contact not found." }

  await prisma.contact.delete({ where: { id } })
  revalidatePath("/contacts")
  return { ok: true }
}

/**
 * Add and/or remove tags across many contacts at once. Computed in a single SQL
 * statement (union the adds, drop the removes, de-dupe) so it scales without a
 * per-row round-trip. Tags are validated against the committee's tag list.
 */
export async function bulkUpdateTags(
  ids: string[],
  add: string[],
  remove: string[],
): Promise<{ ok: boolean; updated?: number; error?: string }> {
  const committeeId = await requireCommitteeIdFor("contacts:update")
  if (!committeeId) return { ok: false, error: "You don't have permission to edit contacts." }

  const valid = await validTagSlugs(committeeId)
  const addT = [...new Set(add.filter((t) => valid.has(t)))]
  const remT = [...new Set(remove.filter((t) => valid.has(t)))]
  const uniqueIds = [...new Set(ids)].filter(Boolean)
  if (uniqueIds.length === 0 || (addT.length === 0 && remT.length === 0)) return { ok: true, updated: 0 }

  const updated = await prisma.$executeRawUnsafe(
    `UPDATE engagecampaign."Contact"
     SET types = COALESCE((
       SELECT array_agg(DISTINCT t)
       FROM unnest(types || $1::text[]) AS t
       WHERE t <> ALL($2::text[])
     ), ARRAY[]::text[]),
     "updatedAt" = now()
     WHERE id = ANY($3::text[]) AND "committeeId" = $4`,
    addT,
    remT,
    uniqueIds,
    committeeId,
  )
  revalidatePath("/contacts")
  return { ok: true, updated: Number(updated) }
}

/** Delete many contacts at once (committee-scoped). Cascades their child rows. */
export async function bulkDeleteContacts(ids: string[]): Promise<{ ok: boolean; deleted?: number; error?: string }> {
  const committeeId = await requireCommitteeIdFor("contacts:delete")
  if (!committeeId) return { ok: false, error: "You don't have permission to delete contacts." }

  const unique = [...new Set(ids)].filter(Boolean)
  if (unique.length === 0) return { ok: true, deleted: 0 }

  // Hard-scope to the committee so only the caller's own contacts can be deleted.
  const res = await prisma.contact.deleteMany({ where: { id: { in: unique }, committeeId } })
  revalidatePath("/contacts")
  return { ok: true, deleted: res.count }
}
