import "server-only"
import { prisma } from "@/lib/prisma"
import { DEFAULT_TAGS, type TagDef } from "@/lib/tags"

/** The committee's effective tag list: fixed built-ins + its custom tags. */
export async function getCommitteeTags(committeeId: string): Promise<TagDef[]> {
  const custom = await prisma.committeeTag.findMany({
    where: { committeeId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { slug: true, label: true, color: true },
  })
  return [...DEFAULT_TAGS, ...custom.map((t) => ({ slug: t.slug, label: t.label, color: t.color }))]
}

/** Set of valid tag slugs for a committee (built-ins + custom) — for write validation. */
export async function validTagSlugs(committeeId: string): Promise<Set<string>> {
  const tags = await getCommitteeTags(committeeId)
  return new Set(tags.map((t) => t.slug))
}
