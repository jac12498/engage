"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { getCommitteeDonors, getDonorSources, type CommitteeDonor } from "@/lib/committeeDonors"

export type ImportDonorsResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; error: string }

/** Normalized "first|last" identity used to skip donors already in the contact list. */
function nameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toUpperCase()}|${lastName.trim().toUpperCase()}`
}

/**
 * Create contacts from selected donors. `sourceKey` names which committee's donors —
 * the active committee itself or one of its candidates' committees; both the source
 * list and the donor set are re-derived server-side (`getDonorSources` reads the DB;
 * `getCommitteeDonors` hard-scopes to that filer id — the legal boundary), so the
 * client can neither inject an arbitrary filer id nor arbitrary names. Each new contact
 * is tagged "donor" with its contributions as ContactDonation rows. Existing contacts
 * are skipped.
 */
export async function importDonors(sourceKey: string, selectedKeys: string[]): Promise<ImportDonorsResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:create")) {
    return { ok: false, error: "You don't have permission to add contacts." }
  }
  const committeeId = ctx.committee.id
  const keys = new Set(selectedKeys.filter(Boolean))
  if (keys.size === 0) return { ok: true, created: 0, skipped: 0 }

  // Resolve the requested source against the committee's allowed sources (its own
  // filer id + its candidates' filer ids) — never trust a client-supplied filer id.
  const sources = await getDonorSources(committeeId)
  const source = sources.find((s) => s.key === sourceKey)
  if (!source) return { ok: false, error: "That donor source isn't available." }

  const result = await getCommitteeDonors(source.scope)
  if (!result.available) {
    return { ok: false, error: "Committee donors aren't available to import." }
  }
  const selected = result.donors.filter((d) => keys.has(d.key))
  if (selected.length === 0) return { ok: true, created: 0, skipped: 0 }

  // Skip donors who already match an existing contact (by first+last name).
  const existing = await prisma.contact.findMany({
    where: { committeeId },
    select: { firstName: true, lastName: true },
  })
  const existingNames = new Set(existing.map((c) => nameKey(c.firstName, c.lastName)))

  let created = 0
  let skipped = 0
  for (const donor of selected) {
    if (existingNames.has(nameKey(donor.firstName, donor.lastName))) {
      skipped++
      continue
    }
    await createContactFromDonor(committeeId, donor)
    existingNames.add(nameKey(donor.firstName, donor.lastName)) // guard against dup keys within the batch
    created++
  }

  revalidatePath("/contacts")
  return { ok: true, created, skipped }
}

async function createContactFromDonor(committeeId: string, donor: CommitteeDonor): Promise<void> {
  const donorName =
    [donor.firstName, donor.lastName].map((x) => x.trim()).filter(Boolean).join(" ") || donor.lastName

  const hasAddress = Boolean(donor.street || donor.city || donor.zip)

  // Dedupe by refKey — (contactId, source, refKey) is unique, and identical
  // same-day/same-amount rows would otherwise collide within this new contact.
  const seen = new Set<string>()
  const contributions = donor.contributions.filter((c) => {
    if (!c.refKey || seen.has(c.refKey)) return false
    seen.add(c.refKey)
    return true
  })

  await prisma.contact.create({
    data: {
      committeeId,
      firstName: donor.firstName,
      lastName: donor.lastName,
      types: ["donor"],
      source: "import",
      ...(hasAddress && {
        addresses: {
          create: {
            label: "Home",
            line1: donor.street ?? "",
            city: donor.city,
            state: donor.state,
            zip: donor.zip,
          },
        },
      }),
      donations: {
        create: contributions.map((c) => ({
          committeeId,
          source: "ny",
          refKey: c.refKey,
          donorName,
          recipient: c.recipient,
          amount: c.amount,
          donationDate: c.donationDate,
          city: donor.city,
          state: donor.state,
          employer: donor.employer,
          occupation: donor.occupation,
        })),
      },
    },
  })
}
