"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CONTACT_TYPES } from "@/lib/contacts"

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
  /** Tag names; created on the fly if new (scoped to the campaign). */
  tags?: string[]
  /** Optional note to append to the history on this save. */
  newNote?: string
}

export type ContactResult = { ok: true; id: string } | { ok: false; error: string }

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

/**
 * Upsert tag names into the campaign's Tag list and return their ids.
 * De-dupes case-insensitively by trimmed name.
 */
async function resolveTagIds(campaignId: string, names: string[]): Promise<string[]> {
  const seen = new Set<string>()
  const clean: string[] = []
  for (const n of names) {
    const name = n.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    clean.push(name)
  }
  const ids: string[] = []
  for (const name of clean.slice(0, 50)) {
    const tag = await prisma.tag.upsert({
      where: { campaignId_name: { campaignId, name } },
      create: { campaignId, name },
      update: {},
      select: { id: true },
    })
    ids.push(tag.id)
  }
  return ids
}

/** Create or update a contact (with its emails/phones/tags), scoped to the caller's campaign. */
export async function saveContact(input: ContactInput): Promise<ContactResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const firstName = input.firstName?.trim()
  const lastName = input.lastName?.trim()
  if (!firstName) return { ok: false, error: "First name is required." }
  if (!lastName) return { ok: false, error: "Last name is required." }

  const types = (input.types ?? []).filter((t) => (CONTACT_TYPES as readonly string[]).includes(t))

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

  const tagIds = await resolveTagIds(campaignId, input.tags ?? [])
  const newNote = clean(input.newNote)

  const scalar = { firstName, lastName, types }

  const emailCreate = emailRes.rows.map((r) => ({ label: r.label, email: r.value, order: r.order }))
  const phoneCreate = phoneRes.rows.map((r) => ({ label: r.label, phone: r.value, order: r.order }))
  const addressCreate = addrRes.rows

  if (input.id) {
    // Guard: only touch a contact that belongs to this campaign.
    const existing = await prisma.contact.findFirst({
      where: { id: input.id, campaignId },
      select: { id: true },
    })
    if (!existing) return { ok: false, error: "Contact not found." }

    // Replace child collections wholesale; append the optional note.
    await prisma.$transaction([
      prisma.contactEmail.deleteMany({ where: { contactId: input.id } }),
      prisma.contactPhone.deleteMany({ where: { contactId: input.id } }),
      prisma.contactAddress.deleteMany({ where: { contactId: input.id } }),
      prisma.contactTag.deleteMany({ where: { contactId: input.id } }),
      prisma.contact.update({
        where: { id: input.id },
        data: {
          ...scalar,
          emails: { create: emailCreate },
          phones: { create: phoneCreate },
          addresses: { create: addressCreate },
          contactTags: { create: tagIds.map((tagId) => ({ tagId })) },
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
      campaignId,
      source: "manual",
      ...scalar,
      emails: { create: emailCreate },
      phones: { create: phoneCreate },
      addresses: { create: addressCreate },
      contactTags: { create: tagIds.map((tagId) => ({ tagId })) },
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
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const text = body?.trim()
  if (!text) return { ok: false, error: "Note can't be empty." }

  const existing = await prisma.contact.findFirst({
    where: { id: contactId, campaignId },
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
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const note = await prisma.contactNote.findFirst({
    where: { id: noteId, contact: { campaignId } },
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
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const existing = await prisma.contact.findFirst({
    where: { id, campaignId },
    select: { id: true },
  })
  if (!existing) return { ok: false, error: "Contact not found." }

  await prisma.contact.delete({ where: { id } })
  revalidatePath("/contacts")
  return { ok: true }
}
