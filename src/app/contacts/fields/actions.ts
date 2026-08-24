"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { FIELD_TYPES, fieldNeedsOptions, type ContactFieldType } from "@/lib/contactFields"

export type FieldResult = { ok: true } | { ok: false; error: string }

const VALID_TYPES = new Set(FIELD_TYPES.map((t) => t.type))

async function committeeForFieldEdit(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:update")) return null
  return ctx.committee.id
}

function cleanOptions(type: ContactFieldType, options: string[]): string[] {
  if (!fieldNeedsOptions(type)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const o of options) {
    const v = o.trim().slice(0, 60)
    if (v && !seen.has(v.toLowerCase())) {
      seen.add(v.toLowerCase())
      out.push(v)
    }
  }
  return out
}

export async function createField(label: string, type: string, options: string[]): Promise<FieldResult> {
  const committeeId = await committeeForFieldEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage fields." }

  const name = label.trim().slice(0, 60)
  if (!name) return { ok: false, error: "Please name the field." }
  if (!VALID_TYPES.has(type as ContactFieldType)) return { ok: false, error: "Unknown field type." }
  const t = type as ContactFieldType
  const opts = cleanOptions(t, options)
  if (fieldNeedsOptions(t) && opts.length === 0) return { ok: false, error: "Add at least one choice." }

  const max = await prisma.contactField.aggregate({ where: { committeeId }, _max: { order: true } })
  await prisma.contactField.create({
    data: { committeeId, label: name, type: t, options: opts, order: (max._max.order ?? 0) + 1 },
  })
  revalidatePath("/contacts")
  revalidatePath("/contacts/fields")
  return { ok: true }
}

/** Rename or edit the choice list of a field (its type is fixed). */
export async function updateField(id: string, patch: { label?: string; options?: string[] }): Promise<FieldResult> {
  const committeeId = await committeeForFieldEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage fields." }

  const field = await prisma.contactField.findFirst({ where: { id, committeeId }, select: { type: true } })
  if (!field) return { ok: false, error: "Field not found." }

  const data: { label?: string; options?: string[] } = {}
  if (patch.label !== undefined) {
    const name = patch.label.trim().slice(0, 60)
    if (!name) return { ok: false, error: "Please name the field." }
    data.label = name
  }
  if (patch.options !== undefined) {
    const opts = cleanOptions(field.type as ContactFieldType, patch.options)
    if (fieldNeedsOptions(field.type as ContactFieldType) && opts.length === 0) return { ok: false, error: "Add at least one choice." }
    data.options = opts
  }
  await prisma.contactField.updateMany({ where: { id, committeeId }, data })
  revalidatePath("/contacts")
  revalidatePath("/contacts/fields")
  return { ok: true }
}

/** Delete a field and strip its value from every contact's customFields JSON. */
export async function deleteField(id: string): Promise<FieldResult> {
  const committeeId = await committeeForFieldEdit()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage fields." }

  const field = await prisma.contactField.findFirst({ where: { id, committeeId }, select: { id: true } })
  if (!field) return { ok: false, error: "Field not found." }

  await prisma.$executeRawUnsafe(
    `UPDATE engagecampaign."Contact" SET "customFields" = "customFields" - $1::text WHERE "committeeId" = $2 AND jsonb_exists("customFields", $1::text)`,
    id,
    committeeId,
  )
  await prisma.contactField.delete({ where: { id } })
  revalidatePath("/contacts")
  revalidatePath("/contacts/fields")
  return { ok: true }
}
