import "server-only"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { validateBlock } from "@/lib/website/blocks"
import { safeColor, safeFont, safeStr, safeUrl, safeEmail } from "@/lib/website/sanitize"
import { slugify } from "@/lib/website/slug"

/**
 * SitePrototype — a portable, self-validating snapshot of a website's structure and
 * content (pages + blocks + theme/links). It is the single interchange format behind
 * templates (universal & per-committee), version snapshots, and website import.
 *
 * Safety: `importPrototype` runs EVERY block through `validateBlock` (the same
 * boundary manual and AI edits pass), so an arbitrary/untrusted prototype — an AI
 * mapping of a crawled external site, a pasted JSON — can never inject unknown block
 * types, unsafe hrefs, or oversized strings. Binary logo and per-committee identity
 * (public slug, publish state) are intentionally NOT part of the format: they stay on
 * the live Website, so importing a prototype never clobbers a committee's logo/URL.
 */

export type PrototypeAudience = "party" | "candidate" | "any"

export interface SitePrototypeBlock {
  type: string
  props: unknown
}
export interface SitePrototypePage {
  title: string
  slug: string
  isHome: boolean
  showInNav: boolean
  published: boolean
  blocks: SitePrototypeBlock[]
}
export interface SitePrototype {
  version: 1
  meta?: { name?: string; description?: string; appliesTo?: PrototypeAudience }
  theme?: { primaryColor: string; accentColor: string; fontTheme: string }
  links?: { donateUrl: string | null; contactEmail: string | null }
  pages: SitePrototypePage[]
}

// ─── Normalization (untrusted input → safe SitePrototype) ──────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/**
 * Coerce arbitrary input into a valid SitePrototype: sanitize theme/links, validate
 * every block, dedupe page slugs, and enforce the invariants the app relies on
 * (≥1 page; exactly one home; the home page is live + in-nav). Never throws.
 */
export function normalizePrototype(raw: unknown): SitePrototype {
  const r = asRecord(raw)

  // meta
  const metaR = asRecord(r.meta)
  const appliesTo = metaR.appliesTo
  const meta = {
    name: safeStr(metaR.name, 200) ?? undefined,
    description: safeStr(metaR.description, 500) ?? undefined,
    appliesTo: (appliesTo === "party" || appliesTo === "candidate" ? appliesTo : "any") as PrototypeAudience,
  }

  // theme (only when the prototype carries one — otherwise schema defaults apply)
  let theme: SitePrototype["theme"]
  if (r.theme) {
    const t = asRecord(r.theme)
    theme = {
      primaryColor: safeColor(t.primaryColor, "#1b3a6b"),
      accentColor: safeColor(t.accentColor, "#c4910a"),
      fontTheme: safeFont(t.fontTheme),
    }
  }

  // links
  let links: SitePrototype["links"]
  if (r.links) {
    const l = asRecord(r.links)
    links = { donateUrl: safeUrl(l.donateUrl), contactEmail: safeEmail(l.contactEmail) }
  }

  // pages + blocks
  const pagesRaw = Array.isArray(r.pages) ? r.pages : []
  const usedSlugs = new Set<string>()
  const pages: SitePrototypePage[] = []
  for (const pr of pagesRaw) {
    const p = asRecord(pr)
    const title = safeStr(p.title, 100) ?? "Untitled"
    const base = slugify(safeStr(p.slug, 100) ?? title) || "page"
    let slug = base
    let n = 1
    while (usedSlugs.has(slug)) {
      n += 1
      slug = `${base}-${n}`
    }
    usedSlugs.add(slug)

    const blocksRaw = Array.isArray(p.blocks) ? p.blocks : []
    const blocks: SitePrototypeBlock[] = []
    for (const br of blocksRaw) {
      const b = asRecord(br)
      const valid = validateBlock(b.type, b.props) // drops unknown types + sanitizes props
      if (valid) blocks.push({ type: valid.type, props: valid.props })
    }

    pages.push({
      title,
      slug,
      isHome: !!p.isHome,
      showInNav: p.showInNav === undefined ? true : !!p.showInNav,
      published: p.published === undefined ? true : !!p.published,
      blocks,
    })
  }

  if (pages.length === 0) {
    pages.push({ title: "Home", slug: "home", isHome: true, showInNav: true, published: true, blocks: [] })
  }

  // Exactly one home (keep the first flagged; default to the first page).
  const homeIdx = pages.findIndex((p) => p.isHome)
  const home = homeIdx === -1 ? 0 : homeIdx
  pages.forEach((p, i) => {
    p.isHome = i === home
  })
  // The home page is served at the root — force it live + in-nav.
  pages[home].published = true
  pages[home].showInNav = true

  return { version: 1, meta, theme, links, pages }
}

// ─── Serialize: live site → prototype ──────────────────────────────────────────

export interface SerializeOptions {
  /** Include theme (colors/font). Default true. */
  includeTheme?: boolean
  /** Include donate/contact links. Default true — turn OFF for a shareable template. */
  includeLinks?: boolean
}

/** Snapshot a committee's live site as a SitePrototype (null if it has no site). */
export async function serializeSite(
  committeeId: string,
  opts: SerializeOptions = {}
): Promise<SitePrototype | null> {
  const site = await prisma.website.findUnique({
    where: { committeeId },
    select: {
      siteTitle: true,
      primaryColor: true,
      accentColor: true,
      fontTheme: true,
      donateUrl: true,
      contactEmail: true,
      pages: {
        orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
        select: {
          title: true,
          slug: true,
          isHome: true,
          showInNav: true,
          published: true,
          blocks: { orderBy: { order: "asc" }, select: { type: true, props: true } },
        },
      },
    },
  })
  if (!site) return null

  const proto: SitePrototype = {
    version: 1,
    meta: { name: site.siteTitle ?? undefined },
    pages: site.pages.map((p) => ({
      title: p.title,
      slug: p.slug,
      isHome: p.isHome,
      showInNav: p.showInNav,
      published: p.published,
      blocks: p.blocks.map((b) => ({ type: b.type, props: b.props ?? {} })),
    })),
  }
  if (opts.includeTheme !== false) {
    proto.theme = { primaryColor: site.primaryColor, accentColor: site.accentColor, fontTheme: site.fontTheme }
  }
  if (opts.includeLinks !== false) {
    proto.links = { donateUrl: site.donateUrl, contactEmail: site.contactEmail }
  }
  return proto
}

// ─── Import: prototype → live site ─────────────────────────────────────────────

/** Free website slug (public path, globally unique), appending -2, -3… on collision. */
async function uniqueWebsiteSlug(base: string): Promise<string> {
  const root = slugify(base) || "site"
  let candidate = root
  let n = 1
  for (;;) {
    const existing = await prisma.website.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}

/** Theme/link fields to write, taken only from what the prototype carries. */
function settingsFrom(proto: SitePrototype) {
  const s: {
    primaryColor?: string
    accentColor?: string
    fontTheme?: string
    donateUrl?: string | null
    contactEmail?: string | null
  } = {}
  if (proto.theme) {
    s.primaryColor = proto.theme.primaryColor
    s.accentColor = proto.theme.accentColor
    s.fontTheme = proto.theme.fontTheme
  }
  if (proto.links) {
    s.donateUrl = proto.links.donateUrl
    s.contactEmail = proto.links.contactEmail
  }
  return s
}

function pageCreateInputs(proto: SitePrototype) {
  return proto.pages.map((pg, i) => ({
    slug: pg.slug,
    title: pg.title,
    navOrder: i,
    showInNav: pg.showInNav,
    published: pg.published,
    isHome: pg.isHome,
    blocks: {
      create: pg.blocks.map((b, j) => ({ type: b.type, order: j, props: b.props as Prisma.InputJsonValue })),
    },
  }))
}

export type ImportResult =
  | { ok: true; websiteId: string; slug: string; pages: number }
  | { ok: false; error: string }

/**
 * Materialize a prototype into the committee's live site.
 *  - mode "create" (default): fails if a site already exists.
 *  - mode "replace": swaps the existing site's pages + theme/links, KEEPING its
 *    public slug, publish state, and logo (Website identity is preserved).
 * The prototype is normalized (validated) first, so this is always safe to call.
 */
export async function importPrototype(
  committeeId: string,
  rawProto: unknown,
  opts: { mode?: "create" | "replace" } = {}
): Promise<ImportResult> {
  const proto = normalizePrototype(rawProto)
  const mode = opts.mode ?? "create"

  const existing = await prisma.website.findUnique({
    where: { committeeId },
    select: { id: true, slug: true },
  })
  if (existing && mode !== "replace") {
    return { ok: false, error: "A website already exists for this committee." }
  }

  const settings = settingsFrom(proto)
  const pages = pageCreateInputs(proto)

  if (existing && mode === "replace") {
    await prisma.$transaction([
      prisma.page.deleteMany({ where: { websiteId: existing.id } }), // cascades blocks
      ...pages.map((pc) => prisma.page.create({ data: { websiteId: existing.id, ...pc } })),
      prisma.website.update({ where: { id: existing.id }, data: settings }),
    ])
    return { ok: true, websiteId: existing.id, slug: existing.slug, pages: proto.pages.length }
  }

  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { name: true },
  })
  if (!committee) return { ok: false, error: "Committee not found." }

  const slug = await uniqueWebsiteSlug(proto.meta?.name || committee.name)
  const created = await prisma.website.create({
    data: {
      committeeId,
      siteTitle: proto.meta?.name?.trim() || committee.name,
      paidForBy: committee.name,
      slug,
      published: false,
      ...settings,
      pages: { create: pages },
    },
    select: { id: true, slug: true },
  })
  return { ok: true, websiteId: created.id, slug: created.slug, pages: proto.pages.length }
}
