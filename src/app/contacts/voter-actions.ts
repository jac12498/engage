"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { searchVoters, type VoterCandidate } from "@/lib/voters"

const STATE = "ny" // only NY voter file today

export type VoterSearchResult = { ok: true; candidates: VoterCandidate[] } | { ok: false; error: string }
export type VoterLinkResult = { ok: true } | { ok: false; error: string }

/** Verify the caller holds `perm` and the contact belongs to their active committee. */
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

/** "First [Middle] Last" → first + last (last token is the last name). */
function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: "", lastName: "" }
  if (parts.length === 1) return { firstName: "", lastName: parts[0] }
  return { firstName: parts[0], lastName: parts[parts.length - 1] }
}

export async function searchVotersForContact(
  contactId: string,
  filters: { name: string; city?: string; zip?: string },
): Promise<VoterSearchResult> {
  const owned = await ownedContact(contactId, "contacts:read")
  if (!owned) return { ok: false, error: "Not permitted." }
  const { lastName, firstName } = splitName(filters.name)
  if (!lastName) return { ok: true, candidates: [] }
  try {
    const candidates = await searchVoters(STATE, { lastName, firstName, city: filters.city, zip: filters.zip })
    return { ok: true, candidates }
  } catch (err) {
    console.error("[searchVotersForContact]", err)
    return { ok: false, error: "Voter search failed. Is the voter file loaded?" }
  }
}

export async function linkVoter(contactId: string, stateVoterId: string): Promise<VoterLinkResult> {
  const owned = await ownedContact(contactId, "contacts:update")
  if (!owned) return { ok: false, error: "You don't have permission to edit contacts." }
  const id = stateVoterId?.trim()
  if (!id) return { ok: false, error: "No voter selected." }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      stateVoterId: id,
      voterState: STATE,
      // Tag them a voter (once) now that we've confirmed a match.
      types: owned.types.includes("voter") ? owned.types : [...owned.types, "voter"],
    },
  })
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}

export async function unlinkVoter(contactId: string): Promise<VoterLinkResult> {
  const owned = await ownedContact(contactId, "contacts:update")
  if (!owned) return { ok: false, error: "You don't have permission to edit contacts." }
  await prisma.contact.update({
    where: { id: contactId },
    data: { stateVoterId: null, voterState: null },
  })
  revalidatePath(`/contacts/${contactId}`)
  return { ok: true }
}
