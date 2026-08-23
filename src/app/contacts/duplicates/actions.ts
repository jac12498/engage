"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { canonicalizeEmail } from "@/lib/emailNormalize"

export type MergeResult = { ok: true } | { ok: false; error: string }

/**
 * Merge one or more "loser" contacts into a survivor: move all emails, phones,
 * addresses, notes, donations, and volunteer signups onto the survivor (de-duping
 * emails/phones/donations), union their tags, adopt a voter link if the survivor
 * lacks one, then delete the losers. Committee-scoped; requires contacts:delete.
 */
export async function mergeContacts(survivorId: string, loserIds: string[]): Promise<MergeResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:delete")) {
    return { ok: false, error: "You don't have permission to merge contacts." }
  }
  const committeeId = ctx.committee.id
  const losers = [...new Set(loserIds)].filter((id) => id !== survivorId)
  if (losers.length === 0) return { ok: false, error: "Nothing to merge." }

  const all = await prisma.contact.findMany({
    where: { committeeId, id: { in: [survivorId, ...losers] } },
    select: {
      id: true,
      types: true,
      stateVoterId: true,
      voterState: true,
      emails: { select: { id: true, email: true } },
      phones: { select: { id: true, phone: true } },
      donations: { select: { id: true, source: true, refKey: true } },
    },
  })
  const survivor = all.find((c) => c.id === survivorId)
  if (!survivor) return { ok: false, error: "Contact not found." }
  const loserRows = all.filter((c) => c.id !== survivorId)
  if (loserRows.length !== losers.length) return { ok: false, error: "Some contacts weren't found." }

  const digits = (p: string) => p.replace(/\D/g, "")
  const survEmail = new Set(survivor.emails.map((e) => canonicalizeEmail(e.email)).filter(Boolean))
  const survPhone = new Set(survivor.phones.map((p) => digits(p.phone)).filter(Boolean))
  const survDon = new Set(survivor.donations.map((d) => `${d.source}|${d.refKey}`))

  const emailMove: string[] = []
  const emailDelete: string[] = []
  const phoneMove: string[] = []
  const phoneDelete: string[] = []
  const donationDelete: string[] = []
  for (const l of loserRows) {
    for (const e of l.emails) {
      const k = canonicalizeEmail(e.email)
      if (k && survEmail.has(k)) emailDelete.push(e.id)
      else {
        emailMove.push(e.id)
        if (k) survEmail.add(k)
      }
    }
    for (const p of l.phones) {
      const k = digits(p.phone)
      if (k && survPhone.has(k)) phoneDelete.push(p.id)
      else {
        phoneMove.push(p.id)
        if (k) survPhone.add(k)
      }
    }
    for (const d of l.donations) {
      const dk = `${d.source}|${d.refKey}`
      if (survDon.has(dk)) donationDelete.push(d.id)
      else survDon.add(dk)
    }
  }

  const types = [...new Set([...survivor.types, ...loserRows.flatMap((l) => l.types)])]
  const voterSrc = survivor.stateVoterId ? null : loserRows.find((l) => l.stateVoterId)
  const voterData = voterSrc ? { stateVoterId: voterSrc.stateVoterId, voterState: voterSrc.voterState } : {}
  const emailStart = survivor.emails.length
  const phoneStart = survivor.phones.length

  await prisma.$transaction(async (tx) => {
    if (emailDelete.length) await tx.contactEmail.deleteMany({ where: { id: { in: emailDelete } } })
    if (phoneDelete.length) await tx.contactPhone.deleteMany({ where: { id: { in: phoneDelete } } })
    if (donationDelete.length) await tx.contactDonation.deleteMany({ where: { id: { in: donationDelete } } })

    // Reassign kept emails/phones, continuing the survivor's ordering.
    for (let i = 0; i < emailMove.length; i++)
      await tx.contactEmail.update({ where: { id: emailMove[i] }, data: { contactId: survivorId, order: emailStart + i } })
    for (let i = 0; i < phoneMove.length; i++)
      await tx.contactPhone.update({ where: { id: phoneMove[i] }, data: { contactId: survivorId, order: phoneStart + i } })

    // Move the remaining child rows wholesale.
    await tx.contactAddress.updateMany({ where: { contactId: { in: losers } }, data: { contactId: survivorId } })
    await tx.contactNote.updateMany({ where: { contactId: { in: losers } }, data: { contactId: survivorId } })
    await tx.contactDonation.updateMany({ where: { contactId: { in: losers } }, data: { contactId: survivorId } })
    await tx.volunteerSignup.updateMany({ where: { contactId: { in: losers } }, data: { contactId: survivorId } })

    await tx.contact.update({ where: { id: survivorId }, data: { types, ...voterData } })
    await tx.contact.deleteMany({ where: { id: { in: losers }, committeeId } })
    await tx.contactMergeDismissal.deleteMany({
      where: { OR: [{ aId: { in: losers } }, { bId: { in: losers } }] },
    })
  })

  revalidatePath("/contacts")
  revalidatePath("/contacts/duplicates")
  return { ok: true }
}

/** Mark every pair in a group as "not a duplicate" so it stops appearing. */
export async function dismissDuplicateGroup(ids: string[]): Promise<MergeResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:update")) {
    return { ok: false, error: "You don't have permission to update contacts." }
  }
  const committeeId = ctx.committee.id
  const uniq = [...new Set(ids)]
  if (uniq.length < 2) return { ok: false, error: "Nothing to dismiss." }
  const count = await prisma.contact.count({ where: { committeeId, id: { in: uniq } } })
  if (count !== uniq.length) return { ok: false, error: "Some contacts weren't found." }

  const pairs: { committeeId: string; aId: string; bId: string }[] = []
  for (let i = 0; i < uniq.length; i++)
    for (let j = i + 1; j < uniq.length; j++) {
      const [a, b] = uniq[i] < uniq[j] ? [uniq[i], uniq[j]] : [uniq[j], uniq[i]]
      pairs.push({ committeeId, aId: a, bId: b })
    }
  await prisma.contactMergeDismissal.createMany({ data: pairs, skipDuplicates: true })
  revalidatePath("/contacts")
  revalidatePath("/contacts/duplicates")
  return { ok: true }
}
