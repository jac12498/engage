"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { type Prisma } from "@/generated/prisma/client"
import { BLOCK_SPECS, isBlockType, validateBlock } from "@/lib/website/blocks"
import { safeColor, safeFont, safeStr, safeUrl, safeEmail } from "@/lib/website/sanitize"
import { slugify } from "@/lib/website/slug"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function currentCampaignId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const c = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return c?.id ?? null
}

/** The caller's website, or null. */
async function ownedSite(campaignId: string) {
  return prisma.website.findUnique({ where: { campaignId }, select: { id: true } })
}

/** A page the caller owns (page → website → campaign), or null. */
async function ownedPage(campaignId: string, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, website: { campaignId } },
    select: { id: true, websiteId: true, isHome: true },
  })
}

/** A block the caller owns (block → page → website → campaign), or null. */
async function ownedBlock(campaignId: string, blockId: string) {
  return prisma.block.findFirst({
    where: { id: blockId, page: { website: { campaignId } } },
    select: { id: true, pageId: true, type: true, order: true },
  })
}

function revalidate(campaignId: string) {
  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
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

export async function createPage(title: string): Promise<Result<{ pageId: string }>> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const site = await ownedSite(campaignId)
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
  revalidate(campaignId)
  return { ok: true, pageId: page.id }
}

export interface PagePatch {
  title?: string
  slug?: string
  navOrder?: number
  showInNav?: boolean
  published?: boolean
}

export async function updatePage(id: string, patch: PagePatch): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const page = await ownedPage(campaignId, id)
  if (!page) return { ok: false, error: "Page not found." }

  const data: Prisma.PageUpdateInput = {}
  if (patch.title !== undefined) data.title = safeStr(patch.title, 100) ?? "Untitled"
  if (patch.slug !== undefined) {
    data.slug = await uniquePageSlug(page.websiteId, patch.slug || "page", page.id)
  }
  if (patch.navOrder !== undefined && Number.isFinite(patch.navOrder)) {
    data.navOrder = Math.trunc(patch.navOrder)
  }
  if (patch.showInNav !== undefined) data.showInNav = !!patch.showInNav
  if (patch.published !== undefined) data.published = !!patch.published

  await prisma.page.update({ where: { id: page.id }, data })
  revalidate(campaignId)
  return { ok: true }
}

export async function deletePage(id: string): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const page = await ownedPage(campaignId, id)
  if (!page) return { ok: false, error: "Page not found." }
  if (page.isHome) return { ok: false, error: "The home page can't be deleted." }

  await prisma.page.delete({ where: { id: page.id } }) // cascades blocks
  revalidate(campaignId)
  return { ok: true }
}

export async function reorderPages(orderedIds: string[]): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const site = await ownedSite(campaignId)
  if (!site) return { ok: false, error: "No website." }

  // Only reorder pages that actually belong to this site.
  const pages = await prisma.page.findMany({ where: { websiteId: site.id }, select: { id: true } })
  const owned = new Set(pages.map((p) => p.id))
  const ids = orderedIds.filter((id) => owned.has(id))

  await prisma.$transaction(
    ids.map((id, i) => prisma.page.update({ where: { id }, data: { navOrder: i } }))
  )
  revalidate(campaignId)
  return { ok: true }
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export async function addBlock(
  pageId: string,
  type: string,
  atIndex?: number
): Promise<Result<{ blockId: string }>> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const page = await ownedPage(campaignId, pageId)
  if (!page) return { ok: false, error: "Page not found." }
  if (!isBlockType(type)) return { ok: false, error: "Unknown block type." }

  const props = BLOCK_SPECS[type].defaultProps() as Prisma.InputJsonValue
  const siblings = await prisma.block.findMany({
    where: { pageId: page.id },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const index =
    atIndex === undefined ? siblings.length : Math.min(Math.max(Math.trunc(atIndex), 0), siblings.length)

  // Renumber so the new block lands at `index`.
  const ops = siblings
    .slice(index)
    .map((b, k) => prisma.block.update({ where: { id: b.id }, data: { order: index + k + 1 } }))
  const created = await prisma.block.create({
    data: { pageId: page.id, type, order: index, props },
    select: { id: true },
  })
  if (ops.length) await prisma.$transaction(ops)

  revalidate(campaignId)
  return { ok: true, blockId: created.id }
}

export async function updateBlockProps(blockId: string, rawProps: unknown): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const block = await ownedBlock(campaignId, blockId)
  if (!block) return { ok: false, error: "Block not found." }

  const validated = validateBlock(block.type, rawProps)
  if (!validated) return { ok: false, error: "Unknown block type." }

  await prisma.block.update({
    where: { id: block.id },
    data: { props: validated.props as Prisma.InputJsonValue },
  })
  revalidate(campaignId)
  return { ok: true }
}

/** Reposition a block to `toIndex` within its page (or move it to `toPageId`). */
export async function moveBlock(blockId: string, toIndex: number, toPageId?: string): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const block = await ownedBlock(campaignId, blockId)
  if (!block) return { ok: false, error: "Block not found." }

  let targetPageId = block.pageId
  if (toPageId && toPageId !== block.pageId) {
    const dest = await ownedPage(campaignId, toPageId)
    if (!dest) return { ok: false, error: "Destination page not found." }
    targetPageId = dest.id
  }

  const siblings = await prisma.block.findMany({
    where: { pageId: targetPageId, id: { not: block.id } },
    orderBy: { order: "asc" },
    select: { id: true },
  })
  const index = Math.min(Math.max(Math.trunc(toIndex), 0), siblings.length)
  const ordered = [...siblings.slice(0, index).map((b) => b.id), block.id, ...siblings.slice(index).map((b) => b.id)]

  await prisma.$transaction([
    ...(targetPageId !== block.pageId
      ? [prisma.block.update({ where: { id: block.id }, data: { pageId: targetPageId } })]
      : []),
    ...ordered.map((id, i) => prisma.block.update({ where: { id }, data: { order: i } })),
  ])
  revalidate(campaignId)
  return { ok: true }
}

export async function deleteBlock(blockId: string): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const block = await ownedBlock(campaignId, blockId)
  if (!block) return { ok: false, error: "Block not found." }

  await prisma.block.delete({ where: { id: block.id } })
  revalidate(campaignId)
  return { ok: true }
}

// ─── Site settings (theme + site-wide links) ─────────────────────────────────

export interface SiteSettingsInput {
  primaryColor?: string
  accentColor?: string
  fontTheme?: string
  donateUrl?: string
  contactEmail?: string
}

export async function updateSiteSettings(input: SiteSettingsInput): Promise<Result> {
  const campaignId = await currentCampaignId()
  if (!campaignId) return { ok: false, error: "Not signed in." }
  const site = await prisma.website.findUnique({
    where: { campaignId },
    select: { id: true, primaryColor: true, accentColor: true },
  })
  if (!site) return { ok: false, error: "No website found." }

  await prisma.website.update({
    where: { id: site.id },
    data: {
      primaryColor: safeColor(input.primaryColor, site.primaryColor),
      accentColor: safeColor(input.accentColor, site.accentColor),
      fontTheme: safeFont(input.fontTheme),
      donateUrl: safeUrl(input.donateUrl),
      contactEmail: safeEmail(input.contactEmail),
    },
  })
  revalidate(campaignId)
  return { ok: true }
}
