"use server"

import { revalidatePath } from "next/cache"
import { getActiveContext } from "@/lib/context"
import { toPlanId } from "@/lib/entitlements"
import { consumeCrawl, refundCrawl } from "@/lib/comms/usage"
import { crawlSite } from "@/lib/website/crawl"
import { mapSiteToPrototype, importPrototypeImages } from "@/lib/website/importSite"
import { saveTemplate, getUsableTemplate, deleteCommitteeTemplate } from "@/lib/website/templates"
import { storeImageBytes } from "@/lib/website/imageStore"
import { importPrototype } from "@/lib/website/prototype"

async function committeeCtx() {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("candidate-websites:update")) return null
  return ctx
}

/**
 * Crawl an external website, map it into our format with AI, and save it as a
 * PER-COMMITTEE template. Gated on an explicit rights acknowledgment (the user
 * confirms they may use the site) and metered as one website crawl.
 */
export async function importWebsiteAsTemplate(input: {
  url: string
  acknowledgedRights: boolean
}): Promise<{ ok: true; templateId: string; name: string; pages: number } | { ok: false; error: string }> {
  const ctx = await committeeCtx()
  if (!ctx) return { ok: false, error: "Not signed in." }
  if (!input.acknowledgedRights) {
    return { ok: false, error: "Please confirm you have the rights to use this website as a template." }
  }
  const { committee } = ctx

  const consumed = await consumeCrawl(toPlanId(committee.plan), committee)
  if (!consumed.ok) {
    return { ok: false, error: `You've used all ${consumed.limit} website imports/crawls this month.` }
  }

  // From here on, refund the crawl on ANY failure and never let a throw escape as a
  // raw server error — the builder should always show a readable message.
  try {
    // Scope the import crawl to the home page + top-level pages: enough for a template,
    // and it keeps the AI mapping small enough to return complete (non-truncated) JSON.
    const crawl = await crawlSite(input.url, { maxPages: 8, maxDepth: 1 })
    if (!crawl.ok) {
      await refundCrawl(committee.id)
      return { ok: false, error: crawl.error }
    }

    const mapped = await mapSiteToPrototype({ host: crawl.host, pages: crawl.pages })
    // Download the images it referenced and rewrite them to our stored copies.
    const prototype = await importPrototypeImages(committee.id, mapped)

    const name = prototype.meta?.name || crawl.host
    const saved = await saveTemplate({
      committeeId: committee.id,
      name,
      description: `Imported from ${crawl.host}`,
      source: `import:${crawl.host}`,
      prototype,
      createdBy: ctx.userId,
    })

    revalidatePath("/website/templates")
    return { ok: true, templateId: saved.id, name, pages: prototype.pages.length }
  } catch (e) {
    await refundCrawl(committee.id)
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't import that site. Please try again." }
  }
}

/**
 * Build the committee's live site from a template (its own or a global).
 * `replace: true` swaps an existing site's pages (keeping slug/publish/logo);
 * otherwise it fails if a site already exists.
 */
export async function createSiteFromTemplate(
  templateId: string,
  opts?: { replace?: boolean }
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const ctx = await committeeCtx()
  if (!ctx) return { ok: false, error: "Not signed in." }

  const tpl = await getUsableTemplate(ctx.committee.id, templateId)
  if (!tpl) return { ok: false, error: "Template not found." }

  const res = await importPrototype(ctx.committee.id, tpl.prototype, {
    mode: opts?.replace ? "replace" : "create",
  })
  if (!res.ok) return { ok: false, error: res.error }

  revalidatePath("/website")
  revalidatePath(`/websites/${ctx.committee.id}`)
  return { ok: true, slug: res.slug }
}

/** Upload an image in the builder; returns its stored serving URL. */
export async function uploadWebsiteImage(
  formData: FormData
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await committeeCtx()
  if (!ctx) return { ok: false, error: "Not signed in." }
  const file = formData.get("file")
  if (!(file instanceof File)) return { ok: false, error: "No file provided." }
  if (file.size > 3_000_000) return { ok: false, error: "Image is too large (max 3 MB)." }

  const bytes = Buffer.from(await file.arrayBuffer())
  const url = await storeImageBytes(ctx.committee.id, bytes, file.type)
  if (!url) return { ok: false, error: "Unsupported image type. Use JPG, PNG, WebP, or GIF (max 3 MB)." }
  return { ok: true, url }
}

export async function deleteTemplate(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await committeeCtx()
  if (!ctx) return { ok: false, error: "Not signed in." }
  const ok = await deleteCommitteeTemplate(ctx.committee.id, templateId)
  if (!ok) return { ok: false, error: "Template not found." }
  revalidatePath("/website/templates")
  return { ok: true }
}
