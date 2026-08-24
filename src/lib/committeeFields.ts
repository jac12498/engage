import "server-only"
import { prisma } from "@/lib/prisma"
import type { ContactFieldDef, ContactFieldType } from "@/lib/contactFields"

/** The committee's custom contact field definitions, in display order. */
export async function getContactFields(committeeId: string): Promise<ContactFieldDef[]> {
  const rows = await prisma.contactField.findMany({
    where: { committeeId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, type: true, options: true },
  })
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    type: r.type as ContactFieldType,
    options: Array.isArray(r.options) ? (r.options as unknown[]).map(String) : [],
  }))
}
