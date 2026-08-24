"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { searchNYDonations, searchFECDonations, type DonationCandidate } from "@/lib/donations"

export type DonationSearchResult = { ok: true; candidates: DonationCandidate[] } | { ok: false; error: string }
export type DonationResult = { ok: true } | { ok: false; error: string }
export type BulkDonationResult = { ok: true; added: number } | { ok: false; error: string }

/** The mutable snapshot fields shared by a donation's create + update. */
function donationSnapshot(d: DonationCandidate) {
  return {
    donorName: d.donorName,
    recipient: d.recipient,
    amount: d.amount,
    donationDate: d.donationDate,
    cycle: d.cycle,
    city: d.city,
    state: d.state,
    employer: d.employer,
    occupation: d.occupation,
  }
}

const validDonation = (d: DonationCandidate) => (d.source === "ny" || d.source === "fec") && !!d.refKey?.trim()

async function ownedContact(contactId: string, perm: "contacts:read" | "contacts:update") {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has(perm)) return null
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, committeeId: ctx.committee.id },
    select: { id: true, types: true },
  })
  if (!contact) return null
  return { committeeId: ctx.committee.id, types: contact.types }
}

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: "", lastName: parts[0] }
  return { firstName: parts[0], lastName: parts[parts.length - 1] }
}

export async function searchDonationsForContact(
  contactId: string,
  filters: { name: string; city?: string; state?: string; zip?: string },
): Promise<DonationSearchResult> {
  const owned = await ownedContact(contactId, "contacts:read")
  if (!owned) return { ok: false, error: "Not permitted." }
  const { lastName, firstName } = splitName(filters.name)
  if (!lastName) return { ok: true, candidates: [] }
  try {
    const [ny, fec] = await Promise.all([
      searchNYDonations({ lastName, firstName, city: filters.city, zip: filters.zip }),
      searchFECDonations({ lastName, firstName, state: filters.state, zip: filters.zip }),
    ])
    // Most recent first, across both sources.
    const candidates = [...ny, ...fec].sort((a, b) => (b.donationDate ?? "").localeCompare(a.donationDate ?? ""))
    return { ok: true, candidates }
  } catch (err) {
    console.error("[searchDonationsForContact]", err)
    return { ok: false, error: "Donation search failed. Are the finance parquets loaded?" }
  }
}

/** Confirm a candidate as this contact's donation (snapshot). Idempotent on (source, refKey). */
export async function addDonation(contactId: string, d: DonationCandidate): Promise<DonationResult> {
  const owned = await ownedContact(contactId, "contacts:update")
  if (!owned) return { ok: false, error: "You don't have permission to edit contacts." }
  if (!validDonation(d)) return { ok: false, error: "Invalid donation." }

  const snap = donationSnapshot(d)
  await prisma.contactDonation.upsert({
    where: { contactId_source_refKey: { contactId, source: d.source, refKey: d.refKey } },
    update: snap,
    create: { contactId, committeeId: owned.committeeId, source: d.source, refKey: d.refKey, ...snap },
  })

  if (!owned.types.includes("donor")) {
    await prisma.contact.update({ where: { id: contactId }, data: { types: [...owned.types, "donor"] } })
  }
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}

/**
 * Confirm many candidates at once (the "Add all" action). Each is upserted
 * (idempotent on source+refKey), chunked into transactions so a large donor's
 * full history goes in without a round-trip per row; the "donor" tag is set once.
 */
export async function addDonations(contactId: string, donations: DonationCandidate[]): Promise<BulkDonationResult> {
  const owned = await ownedContact(contactId, "contacts:update")
  if (!owned) return { ok: false, error: "You don't have permission to edit contacts." }

  const valid = donations.filter(validDonation)
  if (valid.length === 0) return { ok: true, added: 0 }

  const CHUNK = 100
  for (let i = 0; i < valid.length; i += CHUNK) {
    const slice = valid.slice(i, i + CHUNK)
    await prisma.$transaction(
      slice.map((d) => {
        const snap = donationSnapshot(d)
        return prisma.contactDonation.upsert({
          where: { contactId_source_refKey: { contactId, source: d.source, refKey: d.refKey } },
          update: snap,
          create: { contactId, committeeId: owned.committeeId, source: d.source, refKey: d.refKey, ...snap },
        })
      }),
    )
  }

  if (!owned.types.includes("donor")) {
    await prisma.contact.update({ where: { id: contactId }, data: { types: [...owned.types, "donor"] } })
  }
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true, added: valid.length }
}

export async function removeDonation(contactId: string, donationId: string): Promise<DonationResult> {
  const owned = await ownedContact(contactId, "contacts:update")
  if (!owned) return { ok: false, error: "You don't have permission to edit contacts." }
  await prisma.contactDonation.deleteMany({ where: { id: donationId, contactId } })
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}
