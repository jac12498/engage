import "server-only"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { normalizePrototype, type SitePrototype } from "@/lib/website/prototype"

// Committee-scoped SiteTemplate service. Per-committee templates (committeeId set)
// come from website import and "save as template"; global templates (committeeId
// null) are the shared starter library (used later). Every read a committee can act
// on is either its own or a global.

export interface TemplateSummary {
  id: string
  name: string
  description: string | null
  source: string | null
  appliesTo: string
  pageCount: number
  createdAt: Date
}

function countPages(proto: unknown): number {
  const p = proto as { pages?: unknown[] } | null
  return Array.isArray(p?.pages) ? p!.pages.length : 0
}

/** This committee's own templates, newest first. */
export async function listCommitteeTemplates(committeeId: string): Promise<TemplateSummary[]> {
  const rows = await prisma.siteTemplate.findMany({
    where: { committeeId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      source: true,
      appliesTo: true,
      prototype: true,
      createdAt: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    source: r.source,
    appliesTo: r.appliesTo,
    pageCount: countPages(r.prototype),
    createdAt: r.createdAt,
  }))
}

export async function saveTemplate(input: {
  committeeId: string
  name: string
  description?: string | null
  source?: string | null
  prototype: SitePrototype
  createdBy?: string | null
}): Promise<{ id: string }> {
  const proto = normalizePrototype(input.prototype) // re-validate before storing
  const row = await prisma.siteTemplate.create({
    data: {
      committeeId: input.committeeId,
      name: input.name.slice(0, 200) || "Imported site",
      description: input.description?.slice(0, 500) ?? null,
      source: input.source ?? null,
      appliesTo: proto.meta?.appliesTo ?? "any",
      prototype: proto as unknown as Prisma.InputJsonValue,
      createdBy: input.createdBy ?? null,
    },
    select: { id: true },
  })
  return { id: row.id }
}

/** A template this committee may instantiate: its own OR a global (committeeId null). */
export async function getUsableTemplate(committeeId: string, templateId: string) {
  return prisma.siteTemplate.findFirst({
    where: { id: templateId, OR: [{ committeeId }, { committeeId: null }] },
    select: { id: true, name: true, prototype: true },
  })
}

/** Delete one of the committee's own templates (never a global). Returns true if removed. */
export async function deleteCommitteeTemplate(committeeId: string, templateId: string): Promise<boolean> {
  const res = await prisma.siteTemplate.deleteMany({ where: { id: templateId, committeeId } })
  return res.count > 0
}
