"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveModel, toPlanId } from "@/lib/entitlements"
import { consumeGeneration } from "@/lib/comms/usage"
import { generateNewsletterDraft, type NewsletterDraft } from "@/lib/website/newsletterDraft"
import { sendNewsletterNow, type SendResult } from "@/lib/newsletterSend"
import { formatBallotLine } from "@/lib/party"
import { parseBlocks } from "@/lib/newsletter/blocks"
import { parseTemplate } from "@/lib/newsletter/template"
import { type Prisma } from "@/generated/prisma/client"

export type NewsletterResult = { ok: true } | { ok: false; error: string }
export type CreateResult = { ok: true; id: string } | { ok: false; error: string }
export type DraftResult =
  | { ok: true; draft: NewsletterDraft }
  | { ok: false; error: string; limitHit?: boolean }

async function requireCampaign() {
  const session = await auth()
  if (!session?.user?.id) return null
  return prisma.campaign.findUnique({ where: { userId: session.user.id } })
}

async function requireCampaignId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const c = await prisma.campaign.findUnique({ where: { userId: session.user.id }, select: { id: true } })
  return c?.id ?? null
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

/** Create an empty draft and return its id (the manager navigates to the editor). */
export async function createNewsletter(): Promise<CreateResult> {
  const campaignId = await requireCampaignId()
  if (!campaignId) return { ok: false, error: "You must be signed in." }
  const created = await prisma.newsletter.create({ data: { campaignId } })
  revalidatePath("/newsletters")
  return { ok: true, id: created.id }
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

/**
 * AI-draft a newsletter from a short instruction. Metered against Model Credits
 * (this is AI writing, like the Communications module). Returns the draft for the
 * candidate to review/edit — it is NOT persisted here.
 */
export async function draftNewsletter(instruction: string, model?: string): Promise<DraftResult> {
  const campaign = await requireCampaign()
  if (!campaign) return { ok: false, error: "You must be signed in." }

  const text = (instruction ?? "").trim()
  if (!text) return { ok: false, error: "Tell the assistant what this newsletter should be about." }

  const usedModel = resolveModel(model ?? campaign.aiModel)
  const consumed = await consumeGeneration(toPlanId(campaign.plan), campaign, usedModel)
  if (!consumed.ok) {
    return { ok: false, error: "You're out of Model Credits this month.", limitHit: true }
  }

  try {
    const draft = await generateNewsletterDraft(
      {
        candidateName: campaign.candidateName,
        office: campaign.office,
        party: formatBallotLine(campaign.party, campaign.additionalParties),
        district: campaign.district,
        state: campaign.state,
        bio: campaign.bio,
        whyRunning: campaign.whyRunning,
        coreValues: campaign.coreValues,
        voiceTone: campaign.voiceTone,
      },
      text.slice(0, 2000),
      usedModel
    )
    return { ok: true, draft }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Drafting failed. Please try again." }
  }
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
