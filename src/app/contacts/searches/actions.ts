"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import type { SearchQuery } from "@/lib/contactsSearch"

export type SaveSearchResult = { ok: true; id: string } | { ok: false; error: string }
export type SearchActionResult = { ok: true } | { ok: false; error: string }

function cleanName(name: string): string {
  return name.trim().slice(0, 100)
}

/** Create a new committee-shared saved search. */
export async function saveContactSearch(name: string, query: SearchQuery): Promise<SaveSearchResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:read")) {
    return { ok: false, error: "You don't have permission to save searches." }
  }
  const n = cleanName(name)
  if (!n) return { ok: false, error: "Please name the search." }
  if (!Array.isArray(query)) return { ok: false, error: "Invalid search." }

  const created = await prisma.contactSavedSearch.create({
    data: { committeeId: ctx.committee.id, name: n, query: query as object, createdById: ctx.userId },
    select: { id: true },
  })
  revalidatePath("/contacts")
  return { ok: true, id: created.id }
}

/** Update a saved search's query and/or name (committee-scoped). */
export async function updateContactSearch(
  id: string,
  patch: { name?: string; query?: SearchQuery },
): Promise<SearchActionResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:read")) {
    return { ok: false, error: "You don't have permission to update searches." }
  }
  const data: { name?: string; query?: object } = {}
  if (patch.name !== undefined) {
    const n = cleanName(patch.name)
    if (!n) return { ok: false, error: "Please name the search." }
    data.name = n
  }
  if (patch.query !== undefined) {
    if (!Array.isArray(patch.query)) return { ok: false, error: "Invalid search." }
    data.query = patch.query as object
  }
  const res = await prisma.contactSavedSearch.updateMany({
    where: { id, committeeId: ctx.committee.id },
    data,
  })
  if (res.count === 0) return { ok: false, error: "Search not found." }
  revalidatePath("/contacts")
  return { ok: true }
}

/** Delete a saved search (committee-scoped). */
export async function deleteContactSearch(id: string): Promise<SearchActionResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:read")) {
    return { ok: false, error: "You don't have permission to delete searches." }
  }
  await prisma.contactSavedSearch.deleteMany({ where: { id, committeeId: ctx.committee.id } })
  revalidatePath("/contacts")
  return { ok: true }
}
