import "server-only"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { BLOCK_SPECS, isBlockType, validateBlock } from "@/lib/website/blocks"
import { safeColor, safeFont, safeStr, safeUrl, safeEmail } from "@/lib/website/sanitize"
import { slugify } from "@/lib/website/slug"

/**
 * Website content service — the ONE place block/page/site mutations happen.
 * Every function takes a `committeeId` the caller has already authenticated, and
 * re-verifies that the target page/block belongs to that campaign (block → page →
 * website → committeeId) before mutating. It does NOT touch the session or call
 * revalidatePath — those are the callers' concern:
 *   - the server actions in `app/website/blocks-actions.ts` wrap these with the
 *     session lookup + revalidate,
 *   - the conversational builder's tool executor calls them directly and revalidates
 *     once per turn.
 * Keeping the validated, ownership-checked logic here is what lets the manual editor
 * and the AI agent share exactly one safe implementation.
 */

export type SvcResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function ownedSite(committeeId: string) {
  return prisma.website.findUnique({ where: { committeeId }, select: { id: true } })
}
async function ownedPage(committeeId: string, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, website: { committeeId } },
    select: { id: true, websiteId: true, isHome: true },
  })
}
async function ownedBlock(committeeId: string, blockId: string) {
  return prisma.block.findFirst({
    where: { id: blockId, page: { website: { committeeId } } },
    select: { id: true, pageId: true, type: true, order: true },
  })
}

/** Free page slug within a website, appending -2, -3… on collision. */
async function uniquePageSlug(websiteId: string, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "page"
  let candidate = root
  let n = 1
  for (;;) {
    const existing = await prisma.page.findFirst({
      where: { websiteId, slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export async function svcCreatePage(committeeId: string, title: string): Promise<SvcResult<{ pageId: string }>> {
  const site = await ownedSite(committeeId)
  if (!site) return { ok: false, error: "No website yet." }

  const cleanTitle = safeStr(title, 100) ?? "New page"
  const slug = await uniquePageSlug(site.id, cleanTitle)
  const max = await prisma.page.aggregate({ where: { websiteId: site.id }, _max: { navOrder: true } })

  const page = await prisma.page.create({
    data: {
      websiteId: site.id,
      slug,
      title: cleanTitle,
      navOrder: (max._max.navOrder ?? 0) + 1,
      showInNav: true,
      published: true,
      isHome: false,
    },
    select: { id: true },
  })
  return { ok: true, pageId: page.id }
}

export interface PagePatch {
  title?: string
  slug?: string
  navOrder?: number
  showInNav?: boolean
  published?: boolean
}

export async function svcUpdatePage(committeeId: string, id: string, patch: PagePatch): Promise<SvcResult> {
  const page = await ownedPage(committeeId, id)
  if (!page) return { ok: false, error: "Page not found." }

  const data: Prisma.PageUpdateInput = {}
  if (patch.title !== undefined) data.title = safeStr(patch.title, 100) ?? "Untitled"
  if (patch.slug !== undefined) data.slug = await uniquePageSlug(page.websiteId, patch.slug || "page", page.id)
  if (patch.navOrder !== undefined && Number.isFinite(patch.navOrder)) data.navOrder = Math.trunc(patch.navOrder)
  if (patch.showInNav !== undefined) data.showInNav = !!patch.showInNav
  if (patch.published !== undefined) data.published = !!patch.published

  await prisma.page.update({ where: { id: page.id }, data })
  return { ok: true }
}

export async function svcDeletePage(committeeId: string, id: string): Promise<SvcResult> {
  const page = await ownedPage(committeeId, id)
  if (!page) return { ok: false, error: "Page not found." }
  if (page.isHome) return { ok: false, error: "The home page can't be deleted." }

  await prisma.page.delete({ where: { id: page.id } }) // cascades blocks
  return { ok: true }
}

export async function svcReorderPages(committeeId: string, orderedIds: string[]): Promise<SvcResult> {
  const site = await ownedSite(committeeId)
  if (!site) return { ok: false, error: "No website." }

  const pages = await prisma.page.findMany({ where: { websiteId: site.id }, select: { id: true } })
  const owned = new Set(pages.map((p) => p.id))
  const ids = orderedIds.filter((id) => owned.has(id))

  await prisma.$transaction(ids.map((id, i) => prisma.page.update({ where: { id }, data: { navOrder: i } })))
  return { ok: true }
}

/**
 * Make `id` the home page: exactly one page per site carries `isHome` (served at
 * the site root). The former home becomes an ordinary page; the new home is forced
 * live + in-nav so the root is never a draft/hidden page.
 */
export async function svcSetHomePage(committeeId: string, id: string): Promise<SvcResult> {
  const page = await ownedPage(committeeId, id)
  if (!page) return { ok: false, error: "Page not found." }
  if (page.isHome) return { ok: true }

  const currentHome = await prisma.page.findFirst({
    where: { websiteId: page.websiteId, isHome: true },
    select: { id: true },
  })
  await prisma.$transaction([
    ...(currentHome ? [prisma.page.update({ where: { id: currentHome.id }, data: { isHome: false } })] : []),
    prisma.page.update({
      where: { id: page.id },
      data: { isHome: true, published: true, showInNav: true },
    }),
  ])
  return { ok: true }
}

/** Copy a page (title "… (copy)", fresh slug, never home) and all of its blocks. */
export async function svcDuplicatePage(
  committeeId: string,
  id: string
): Promise<SvcResult<{ pageId: string }>> {
  const page = await prisma.page.findFirst({
    where: { id, website: { committeeId } },
    select: {
      websiteId: true,
      title: true,
      showInNav: true,
      published: true,
      blocks: { orderBy: { order: "asc" }, select: { type: true, order: true, props: true } },
    },
  })
  if (!page) return { ok: false, error: "Page not found." }

  const title = safeStr(`${page.title} (copy)`, 100) ?? "Page (copy)"
  const slug = await uniquePageSlug(page.websiteId, title)
  const max = await prisma.page.aggregate({ where: { websiteId: page.websiteId }, _max: { navOrder: true } })

  const created = await prisma.page.create({
    data: {
      websiteId: page.websiteId,
      slug,
      title,
      navOrder: (max._max.navOrder ?? 0) + 1,
      showInNav: page.showInNav,
      published: page.published,
      isHome: false,
      blocks: {
        create: page.blocks.map((b) => ({
          type: b.type,
          order: b.order,
          props: (b.props ?? {}) as Prisma.InputJsonValue,
        })),
      },
    },
    select: { id: true },
  })
  return { ok: true, pageId: created.id }
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export async function svcAddBlock(
  committeeId: string,
  pageId: string,
  type: string,
  atIndex?: number,
  initialProps?: unknown
): Promise<SvcResult<{ blockId: string }>> {
  const page = await ownedPage(committeeId, pageId)
  if (!page) return { ok: false, error: "Page not found." }
  if (!isBlockType(type)) return { ok: false, error: `Unknown block type "${type}".` }

  // Start from defaults, then fold in any caller-supplied props (validated).
  const base = BLOCK_SPECS[type].defaultProps()
  const props = (initialProps !== undefined
    ? BLOCK_SPECS[type].validate({ ...(base as object), ...(initialProps as object) })
    : base) as Prisma.InputJsonValue

  const siblings = await prisma.block.findMany({
    where: { pageId: page.id },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const index =
    atIndex === undefined ? siblings.length : Math.min(Math.max(Math.trunc(atIndex), 0), siblings.length)

  const ops = siblings
    .slice(index)
    .map((b, k) => prisma.block.update({ where: { id: b.id }, data: { order: index + k + 1 } }))
  const created = await prisma.block.create({
    data: { pageId: page.id, type, order: index, props },
    select: { id: true },
  })
  if (ops.length) await prisma.$transaction(ops)

  return { ok: true, blockId: created.id }
}

export async function svcUpdateBlockProps(
  committeeId: string,
  blockId: string,
  rawProps: unknown
): Promise<SvcResult> {
  const block = await ownedBlock(committeeId, blockId)
  if (!block) return { ok: false, error: "Block not found." }

  const validated = validateBlock(block.type, rawProps)
  if (!validated) return { ok: false, error: "Unknown block type." }

  await prisma.block.update({
    where: { id: block.id },
    data: { props: validated.props as Prisma.InputJsonValue },
  })
  return { ok: true }
}

/** Reposition a block to `toIndex` within its page (or move it to `toPageId`). */
export async function svcMoveBlock(
  committeeId: string,
  blockId: string,
  toIndex: number,
  toPageId?: string
): Promise<SvcResult> {
  const block = await ownedBlock(committeeId, blockId)
  if (!block) return { ok: false, error: "Block not found." }

  let targetPageId = block.pageId
  if (toPageId && toPageId !== block.pageId) {
    const dest = await ownedPage(committeeId, toPageId)
    if (!dest) return { ok: false, error: "Destination page not found." }
    targetPageId = dest.id
  }

  const siblings = await prisma.block.findMany({
    where: { pageId: targetPageId, id: { not: block.id } },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const index = Math.min(Math.max(Math.trunc(toIndex), 0), siblings.length)
  const ordered = [
    ...siblings.slice(0, index).map((b) => b.id),
    block.id,
    ...siblings.slice(index).map((b) => b.id),
  ]

  await prisma.$transaction([
    ...(targetPageId !== block.pageId
      ? [prisma.block.update({ where: { id: block.id }, data: { pageId: targetPageId } })]
      : []),
    ...ordered.map((id, i) => prisma.block.update({ where: { id }, data: { order: i } })),
  ])
  return { ok: true }
}

export async function svcDeleteBlock(committeeId: string, blockId: string): Promise<SvcResult> {
  const block = await ownedBlock(committeeId, blockId)
  if (!block) return { ok: false, error: "Block not found." }
  await prisma.block.delete({ where: { id: block.id } })
  return { ok: true }
}

// ─── Site settings ───────────────────────────────────────────────────────────

export interface SiteSettingsInput {
  siteTitle?: string
  paidForBy?: string
  primaryColor?: string
  accentColor?: string
  fontTheme?: string
  donateUrl?: string
  contactEmail?: string
}

/** Trim + cap a short free-text field; empty → null. */
function safeText(v: string | undefined, max = 120): string | null {
  const t = (v ?? "").trim()
  return t ? t.slice(0, max) : null
}

export async function svcUpdateSiteSettings(committeeId: string, input: SiteSettingsInput): Promise<SvcResult> {
  const site = await prisma.website.findUnique({
    where: { committeeId },
    select: { id: true, primaryColor: true, accentColor: true },
  })
  if (!site) return { ok: false, error: "No website found." }

  await prisma.website.update({
    where: { id: site.id },
    data: {
      siteTitle: safeText(input.siteTitle),
      paidForBy: safeText(input.paidForBy),
      primaryColor: safeColor(input.primaryColor, site.primaryColor),
      accentColor: safeColor(input.accentColor, site.accentColor),
      fontTheme: safeFont(input.fontTheme),
      donateUrl: safeUrl(input.donateUrl),
      contactEmail: safeEmail(input.contactEmail),
    },
  })
  return { ok: true }
}

// ─── Read: snapshot for the agent's context ──────────────────────────────────

/**
 * A compact, structured view of the current site — pages, their blocks (id, type,
 * props), and theme/links — that the conversational builder feeds to the model so it
 * knows the exact ids to target and the current content.
 */
export async function getSiteSnapshot(committeeId: string) {
  const site = await prisma.website.findUnique({
    where: { committeeId },
    select: {
      slug: true,
      published: true,
      primaryColor: true,
      accentColor: true,
      fontTheme: true,
      donateUrl: true,
      contactEmail: true,
      headshotMime: true,
      pages: {
        orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          slug: true,
          title: true,
          navOrder: true,
          showInNav: true,
          published: true,
          isHome: true,
          blocks: {
            orderBy: { order: "asc" },
            select: { id: true, type: true, order: true, props: true },
          },
        },
      },
    },
  })
  return site
}

export type SiteSnapshot = NonNullable<Awaited<ReturnType<typeof getSiteSnapshot>>>
