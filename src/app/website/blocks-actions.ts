"use server"

import { revalidatePath } from "next/cache"
import { getActiveContext } from "@/lib/context"
import {
  svcCreatePage,
  svcUpdatePage,
  svcDeletePage,
  svcReorderPages,
  svcAddBlock,
  svcUpdateBlockProps,
  svcMoveBlock,
  svcDeleteBlock,
  svcUpdateSiteSettings,
  type PagePatch,
  type SiteSettingsInput,
  type SvcResult,
} from "@/lib/website/blockService"

async function currentCommitteeId(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("candidate-websites:update")) return null
  return ctx.committee.id
}

function revalidate(committeeId: string) {
  revalidatePath("/website")
  revalidatePath(`/websites/${committeeId}`)
}

/**
 * Wrap a service call with the session lookup + revalidation. The manual editor
 * calls these; the conversational builder calls the underlying `svc*` directly.
 */
async function withCampaign<T extends object>(
  op: (committeeId: string) => Promise<SvcResult<T>>
): Promise<SvcResult<T>> {
  const committeeId = await currentCommitteeId()
  if (!committeeId) return { ok: false, error: "Not signed in." }
  const res = await op(committeeId)
  if (res.ok) revalidate(committeeId)
  return res
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export async function createPage(title: string) {
  return withCampaign((id) => svcCreatePage(id, title))
}
export async function updatePage(id: string, patch: PagePatch) {
  return withCampaign((cid) => svcUpdatePage(cid, id, patch))
}
export async function deletePage(id: string) {
  return withCampaign((cid) => svcDeletePage(cid, id))
}
export async function reorderPages(orderedIds: string[]) {
  return withCampaign((cid) => svcReorderPages(cid, orderedIds))
}

// ─── Blocks ──────────────────────────────────────────────────────────────────

export async function addBlock(pageId: string, type: string, atIndex?: number) {
  return withCampaign((cid) => svcAddBlock(cid, pageId, type, atIndex))
}
export async function updateBlockProps(blockId: string, rawProps: unknown) {
  return withCampaign((cid) => svcUpdateBlockProps(cid, blockId, rawProps))
}
export async function moveBlock(blockId: string, toIndex: number, toPageId?: string) {
  return withCampaign((cid) => svcMoveBlock(cid, blockId, toIndex, toPageId))
}
export async function deleteBlock(blockId: string) {
  return withCampaign((cid) => svcDeleteBlock(cid, blockId))
}

// ─── Site settings ───────────────────────────────────────────────────────────

export async function updateSiteSettings(input: SiteSettingsInput) {
  return withCampaign((cid) => svcUpdateSiteSettings(cid, input))
}
