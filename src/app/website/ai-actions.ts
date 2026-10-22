"use server"

import { revalidatePath } from "next/cache"
import { getActiveContext } from "@/lib/context"
import { toPlanId } from "@/lib/entitlements"
import { consumeWebsiteEdit } from "@/lib/comms/usage"
import { isBlockType } from "@/lib/website/blocks"
import {
  loadSiteGrounding,
  aiWriteBlock,
  aiSuggestLayout,
  aiSuggestSitemap,
  type LayoutSuggestion,
  type PageSuggestion,
} from "@/lib/website/aiActions"
import { svcAddBlock, svcCreatePage } from "@/lib/website/blockService"

/** Active committee with edit permission + its plan (website AI is a mutation-adjacent op). */
async function currentCommittee() {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("candidate-websites:update")) return null
  return { committee: ctx.committee, plan: toPlanId(ctx.committee.plan) }
}

type Ok<T> = { ok: true } & T
type Err = { ok: false; error: string; limit?: boolean }

function limitError(used: number, limit: number): Err {
  return {
    ok: false,
    limit: true,
    error: `You've used all ${limit} of this month's website AI actions (${used}/${limit}). They reset next month.`,
  }
}

// ─── Level 3: write / improve one block ────────────────────────────────────────
// Does NOT persist — returns validated props for the editor to review and save, so
// the AI never silently overwrites unsaved edits.

export async function aiWriteBlockAction(input: {
  type: string
  mode: "write" | "improve"
  props: Record<string, unknown>
  instruction?: string
}): Promise<Ok<{ props: Record<string, unknown> }> | Err> {
  const cc = await currentCommittee()
  if (!cc) return { ok: false, error: "Not signed in." }
  if (!isBlockType(input.type)) return { ok: false, error: "Unknown block type." }

  const usage = await consumeWebsiteEdit(cc.plan, cc.committee)
  if (!usage.ok) return limitError(usage.used, usage.limit)

  try {
    const grounding = await loadSiteGrounding(cc.committee.id)
    const props = await aiWriteBlock({
      type: input.type,
      mode: input.mode === "improve" ? "improve" : "write",
      currentProps: input.props ?? {},
      instruction: typeof input.instruction === "string" ? input.instruction.slice(0, 500) : undefined,
      grounding,
    })
    return { ok: true, props }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The AI action failed." }
  }
}

// ─── Level 2: suggest a page's section layout (no mutation) ─────────────────────

export async function aiSuggestLayoutAction(input: {
  pageTitle: string
  existingTypes: string[]
}): Promise<Ok<{ suggestions: LayoutSuggestion[] }> | Err> {
  const cc = await currentCommittee()
  if (!cc) return { ok: false, error: "Not signed in." }

  const usage = await consumeWebsiteEdit(cc.plan, cc.committee)
  if (!usage.ok) return limitError(usage.used, usage.limit)

  try {
    const grounding = await loadSiteGrounding(cc.committee.id)
    const suggestions = await aiSuggestLayout({
      pageTitle: (input.pageTitle || "page").slice(0, 100),
      existingTypes: Array.isArray(input.existingTypes) ? input.existingTypes : [],
      grounding,
    })
    return { ok: true, suggestions }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The AI action failed." }
  }
}

/** Append the chosen block types to a page. Pure mutation — not metered. */
export async function applyLayoutAction(
  pageId: string,
  types: string[]
): Promise<{ ok: true; added: number } | Err> {
  const cc = await currentCommittee()
  if (!cc) return { ok: false, error: "Not signed in." }

  let added = 0
  for (const t of Array.isArray(types) ? types : []) {
    if (!isBlockType(t)) continue
    const r = await svcAddBlock(cc.committee.id, pageId, t)
    if (r.ok) added += 1
    else return { ok: false, error: r.error }
  }
  revalidatePath("/website")
  revalidatePath(`/websites/${cc.committee.id}`)
  return { ok: true, added }
}

// ─── Level 1: suggest a sitemap (no mutation) ───────────────────────────────────

export async function aiSuggestSitemapAction(input: {
  existingTitles: string[]
}): Promise<Ok<{ suggestions: PageSuggestion[] }> | Err> {
  const cc = await currentCommittee()
  if (!cc) return { ok: false, error: "Not signed in." }

  const usage = await consumeWebsiteEdit(cc.plan, cc.committee)
  if (!usage.ok) return limitError(usage.used, usage.limit)

  try {
    const grounding = await loadSiteGrounding(cc.committee.id)
    const suggestions = await aiSuggestSitemap({
      existingTitles: Array.isArray(input.existingTitles) ? input.existingTitles : [],
      grounding,
    })
    return { ok: true, suggestions }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The AI action failed." }
  }
}

/** Create a page and append its suggested blocks. Pure mutation — not metered. */
export async function createPageWithBlocksAction(
  title: string,
  types: string[]
): Promise<{ ok: true; pageId: string } | Err> {
  const cc = await currentCommittee()
  if (!cc) return { ok: false, error: "Not signed in." }

  const page = await svcCreatePage(cc.committee.id, title)
  if (!page.ok) return { ok: false, error: page.error }

  for (const t of Array.isArray(types) ? types : []) {
    if (!isBlockType(t)) continue
    await svcAddBlock(cc.committee.id, page.pageId, t)
  }
  revalidatePath("/website")
  revalidatePath(`/websites/${cc.committee.id}`)
  return { ok: true, pageId: page.pageId }
}
