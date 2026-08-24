"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { BUILTIN_SLUGS, slugify, TAG_COLORS } from "@/lib/tags"

export type TagResult = { ok: true } | { ok: false; error: string }

async function committeeForTagEdit(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:update")) return null
  return ctx.committee.id
}

/** Create a committee custom tag. Slug is derived from the label + de-duplicated. */
export async function createTag(label: string, color: string): Promise<TagResult> {
  const committeeId = await committeeForTagEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage tags." }

  const name = label.trim().slice(0, 40)
  if (!name) return { ok: false, error: "Please name the tag." }
  const col = TAG_COLORS.includes(color) ? color : TAG_COLORS[0]

  const base = slugify(name)
  if (!base) return { ok: false, error: "Please use letters or numbers in the tag name." }

  // Unique slug within the committee (and never colliding with a built-in).
  const existing = new Set(
    (await prisma.committeeTag.findMany({ where: { committeeId }, select: { slug: true } })).map((t) => t.slug),
  )
  let slug = base
  let i = 2
  while (BUILTIN_SLUGS.has(slug) || existing.has(slug)) slug = `${base}-${i++}`

  const max = await prisma.committeeTag.aggregate({ where: { committeeId }, _max: { order: true } })
  await prisma.committeeTag.create({
    data: { committeeId, slug, label: name, color: col, order: (max._max.order ?? 0) + 1 },
  })
  revalidatePath("/contacts")
  revalidatePath("/contacts/tags")
  return { ok: true }
}

/** Rename / recolor a committee custom tag (slug is stable). */
export async function updateTag(id: string, patch: { label?: string; color?: string }): Promise<TagResult> {
  const committeeId = await committeeForTagEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage tags." }

  const data: { label?: string; color?: string } = {}
  if (patch.label !== undefined) {
    const name = patch.label.trim().slice(0, 40)
    if (!name) return { ok: false, error: "Please name the tag." }
    data.label = name
  }
  if (patch.color !== undefined) data.color = TAG_COLORS.includes(patch.color) ? patch.color : TAG_COLORS[0]

  const res = await prisma.committeeTag.updateMany({ where: { id, committeeId }, data })
  if (res.count === 0) return { ok: false, error: "Tag not found." }
  revalidatePath("/contacts")
  revalidatePath("/contacts/tags")
  return { ok: true }
}

/** Delete a committee custom tag and strip its slug from every contact. */
export async function deleteTag(id: string): Promise<TagResult> {
  const committeeId = await committeeForTagEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage tags." }

  const tag = await prisma.committeeTag.findFirst({ where: { id, committeeId }, select: { slug: true } })
  if (!tag) return { ok: false, error: "Tag not found." }

  // Remove the slug from every contact's types, then delete the tag.
  await prisma.$executeRawUnsafe(
    `UPDATE engagecampaign."Contact" SET types = array_remove(types, $1) WHERE "committeeId" = $2 AND $1 = ANY(types)`,
    tag.slug,
    committeeId,
  )
  await prisma.committeeTag.delete({ where: { id } })
  revalidatePath("/contacts")
  revalidatePath("/contacts/tags")
  return { ok: true }
}
