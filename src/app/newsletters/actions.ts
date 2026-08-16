"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast } from "@/lib/context"
import { sendNewsletterNow, sendTestNewsletterNow, type SendResult, type TestSendResult } from "@/lib/newsletterSend"
import { parseBlocks } from "@/lib/newsletter/blocks"
import { parseTemplate } from "@/lib/newsletter/template"
import { builtinPreset } from "@/lib/newsletter/presets"
import { type Prisma } from "@/generated/prisma/client"

export type NewsletterResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; id: string } | { ok: false; error: string }

/** Active campaign id, editor-gated (newsletter actions are all mutations), or null. */
async function requireCampaignId(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !roleAtLeast(ctx.role, "editor")) return null
  return ctx.campaign?.id ?? null
}

function revalidateAll(campaignId: string, newsletterId?: string) {
  revalidatePath("/newsletters")
  if (newsletterId) revalidatePath(`/newsletters/${newsletterId}`)
  revalidatePath(`/websites/${campaignId}/newsletter`)
  if (newsletterId) revalidatePath(`/websites/${campaignId}/newsletter/${newsletterId}`)
  revalidatePath(`/websites/${campaignId}`)
}

/** Save the campaign-level newsletter template (shared header/footer/theme). */
export async function updateNewsletterTemplate(raw: unknown): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const template = parseTemplate(raw)
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { newsletterTemplate: template as unknown as Prisma.InputJsonValue },
  })
  revalidatePath("/newsletters/template")
  return { ok: true }
}

/**
 * Create a newsletter draft and return its id. Optionally seeded from a preset
 * (`presetKey` = "builtin:<key>" or "saved:<id>"), which copies its starting
 * blocks + per-issue branding.
 */
export async function createNewsletter(presetKey?: string): Promise<CreateResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  let blocks: Prisma.InputJsonValue | undefined
  let template: Prisma.InputJsonValue | undefined
  if (presetKey) {
    const [kind, key] = presetKey.split(":")
    if (kind === "builtin") {
      const p = builtinPreset(key ?? "")
      if (p) {
        blocks = parseBlocks(p.blocks) as unknown as Prisma.InputJsonValue
        template = p.template as unknown as Prisma.InputJsonValue
      }
    } else if (kind === "saved" && key) {
      const p = await prisma.newsletterPreset.findFirst({
        where: { id: key, campaignId },
        select: { blocks: true, template: true },
      })
      if (p) {
        blocks = parseBlocks(p.blocks) as unknown as Prisma.InputJsonValue
        template = parseTemplate(p.template) as unknown as Prisma.InputJsonValue
      }
    }
  }

  const created = await prisma.newsletter.create({ data: { campaignId, blocks, template } })
  revalidatePath("/newsletters")
  return { ok: true, id: created.id }
}

/** Save an issue's blocks + resolved branding as a reusable preset. */
export async function saveAsPreset(newsletterId: string, rawName: string): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const name = rawName.trim().slice(0, 80)
  if (!name) return { ok: false, error: "Give the template a name." }

  const n = await prisma.newsletter.findFirst({
    where: { id: newsletterId, campaignId },
    select: { blocks: true, template: true },
  })
  if (!n) return { ok: false, error: "Newsletter not found." }
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { newsletterTemplate: true } })

  const template = parseTemplate(n.template ?? campaign?.newsletterTemplate)
  const blocks = parseBlocks(n.blocks)
  await prisma.newsletterPreset.create({
    data: {
      campaignId,
      name,
      template: template as unknown as Prisma.InputJsonValue,
      blocks: blocks as unknown as Prisma.InputJsonValue,
    },
  })
  revalidatePath("/newsletters/template")
  return { ok: true }
}

/** Delete a saved preset. */
export async function deletePreset(id: string): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const p = await prisma.newsletterPreset.findFirst({ where: { id, campaignId }, select: { id: true } })
  if (!p) return { ok: false, error: "Template not found." }
  await prisma.newsletterPreset.delete({ where: { id: p.id } })
  revalidatePath("/newsletters/template")
  return { ok: true }
}

/** Save subject / preview / content-block edits. Blocks are validated + sanitized. */
export async function updateNewsletter(
  id: string,
  input: { subject?: string; preview?: string; blocks?: unknown }
): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const n = await prisma.newsletter.findFirst({ where: { id, campaignId }, select: { id: true } })
  if (!n) return { ok: false, error: "Newsletter not found." }

  const blocks = input.blocks !== undefined ? parseBlocks(input.blocks) : undefined

  await prisma.newsletter.update({
    where: { id: n.id },
    data: {
      subject: typeof input.subject === "string" ? input.subject.slice(0, 200) : undefined,
      preview: typeof input.preview === "string" ? input.preview.slice(0, 300) || null : undefined,
      blocks: blocks === undefined ? undefined : (blocks as unknown as Prisma.InputJsonValue),
    },
  })
  revalidateAll(campaignId, id)
  return { ok: true }
}

/** Publish a newsletter to the public archive (requires a subject). */
export async function publishNewsletter(id: string): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const n = await prisma.newsletter.findFirst({
    where: { id, campaignId },
    select: { id: true, subject: true, body: true, blocks: true, publishedAt: true },
  })
  if (!n) return { ok: false, error: "Newsletter not found." }
  if (!n.subject.trim()) return { ok: false, error: "Add a subject before publishing." }
  const hasBlocks = Array.isArray(n.blocks) && n.blocks.length > 0
  if (!hasBlocks && !n.body.trim()) return { ok: false, error: "Add some content before publishing." }

  await prisma.newsletter.update({
    where: { id: n.id },
    data: { status: "published", publishedAt: n.publishedAt ?? new Date() },
  })
  revalidateAll(campaignId, id)
  return { ok: true }
}

/** Return a newsletter to draft (removes it from the public archive). */
export async function unpublishNewsletter(id: string): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const n = await prisma.newsletter.findFirst({ where: { id, campaignId }, select: { id: true } })
  if (!n) return { ok: false, error: "Newsletter not found." }

  await prisma.newsletter.update({ where: { id: n.id }, data: { status: "draft" } })
  revalidateAll(campaignId, id)
  return { ok: true }
}

/**
 * Email a published newsletter to all active subscribers. Guarded against
 * double-send (newsletter.sentAt) and metered by recipient count in the send lib.
 */
export async function sendNewsletter(id: string): Promise<SendResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }

  const result = await sendNewsletterNow(campaignId, id)
  if (result.ok) revalidateAll(campaignId, id)
  return result
}

/** Email a single test copy of the newsletter to the account owner. */
export async function sendTestNewsletter(id: string): Promise<TestSendResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  return sendTestNewsletterNow(campaignId, id)
}

/** Permanently delete a newsletter. */
export async function deleteNewsletter(id: string): Promise<NewsletterResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const n = await prisma.newsletter.findFirst({ where: { id, campaignId }, select: { id: true } })
  if (!n) return { ok: false, error: "Newsletter not found." }

  await prisma.newsletter.delete({ where: { id: n.id } })
  revalidateAll(campaignId, id)
  return { ok: true }
}
