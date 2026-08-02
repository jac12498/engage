import "server-only"
import { prisma } from "@/lib/prisma"
import { resend } from "@/lib/email"
import { toPlanId } from "@/lib/entitlements"
import { consumeNewsletterEmails, newsletterHeadroom } from "@/lib/comms/usage"
import { renderNewsletterEmail, hasMailingAddress, type EmailRenderCtx } from "@/lib/newsletter/renderEmail"

// Phase 3: email a published newsletter to a campaign's active subscribers.
// Renders via the block engine (lib/newsletter/renderEmail) from the campaign
// template + the issue's blocks; legacy plain-text `body` renders as one text
// block. Sends in batches of 100 via Resend with a per-recipient one-click
// List-Unsubscribe header. Send-once (guards on newsletter.sentAt).

/** Bulk sends go from the party-neutral, reputation-isolated newsletter subdomain. */
const SEND_ADDRESS = process.env.NEWSLETTER_FROM_ADDRESS || "news@news.engageamplify.com"
const BATCH_SIZE = 100
// Resend's default rate limit is ~2 requests/sec; pace batch calls under it.
const BATCH_DELAY_MS = 600

function baseUrl(): string {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Header display names can't contain commas/quotes/newlines — strip them. */
function sanitizeName(s: string): string {
  return s.replace(/["\r\n,]/g, " ").replace(/\s+/g, " ").trim()
}

export type SendResult =
  | { ok: true; sent: number; failed: number; total: number }
  | { ok: false; error: string; limitHit?: boolean }

export type TestSendResult = { ok: true; to: string } | { ok: false; error: string }

/**
 * Send a single test copy of a newsletter (rendered exactly as subscribers would
 * get it) to the account owner's email. No metering, no subscriber list, no
 * publish/sent requirement — works on a draft so you can preview before sending.
 */
export async function sendTestNewsletterNow(campaignId: string, newsletterId: string): Promise<TestSendResult> {
  const newsletter = await prisma.newsletter.findFirst({
    where: { id: newsletterId, campaignId },
    select: { subject: true, body: true, blocks: true, template: true },
  })
  if (!newsletter) return { ok: false, error: "Newsletter not found." }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      candidateName: true,
      committeeName: true,
      mailingStreet: true,
      mailingStreet2: true,
      mailingCity: true,
      mailingState: true,
      mailingZip: true,
      headshotMime: true,
      newsletterTemplate: true,
      user: { select: { email: true } },
    },
  })
  if (!campaign) return { ok: false, error: "Campaign not found." }
  const to = campaign.user?.email
  if (!to) return { ok: false, error: "No account email to send the test to." }

  const blocks =
    Array.isArray(newsletter.blocks) && newsletter.blocks.length > 0
      ? newsletter.blocks
      : newsletter.body?.trim()
        ? [{ id: "legacy", type: "text", props: { body: newsletter.body } }]
        : []

  const base = baseUrl()
  const html = renderNewsletterEmail(newsletter.template ?? campaign.newsletterTemplate, blocks, {
    subject: newsletter.subject,
    candidateName: campaign.candidateName,
    committeeName: campaign.committeeName,
    campaignId: campaign.id,
    mailing: {
      street: campaign.mailingStreet,
      street2: campaign.mailingStreet2,
      city: campaign.mailingCity,
      state: campaign.mailingState,
      zip: campaign.mailingZip,
    },
    unsubscribeUrl: "#",
    headshotUrl: campaign.headshotMime ? `${base}/api/website/headshot/${campaign.id}` : null,
    baseUrl: base,
  })

  const fromName = sanitizeName(campaign.committeeName || campaign.candidateName) || "Newsletter"
  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <${SEND_ADDRESS}>`,
      to,
      replyTo: to,
      subject: `[Test] ${newsletter.subject || "Newsletter"}`,
      html,
    })
    if (error) {
      console.error("[newsletterSend] test send error:", error)
      return { ok: false, error: "Could not send the test email." }
    }
  } catch (e) {
    console.error("[newsletterSend] test send threw:", e)
    return { ok: false, error: "Could not send the test email." }
  }
  return { ok: true, to }
}

/**
 * Send a published newsletter to all `active` subscribers. Idempotent-guarded by
 * `newsletter.sentAt` (won't re-send). Meters recipient-emails against the plan cap
 * BEFORE sending (all-or-nothing). Records `sentAt` + `recipientCount` on success.
 */
export async function sendNewsletterNow(campaignId: string, newsletterId: string): Promise<SendResult> {
  const newsletter = await prisma.newsletter.findFirst({
    where: { id: newsletterId, campaignId },
    select: { id: true, subject: true, body: true, blocks: true, template: true, status: true, sentAt: true },
  })
  if (!newsletter) return { ok: false, error: "Newsletter not found." }
  if (newsletter.status !== "published") return { ok: false, error: "Publish the newsletter before sending." }
  if (newsletter.sentAt) return { ok: false, error: "This newsletter has already been sent." }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      candidateName: true,
      committeeName: true,
      mailingStreet: true,
      mailingStreet2: true,
      mailingCity: true,
      mailingState: true,
      mailingZip: true,
      headshotMime: true,
      newsletterTemplate: true,
      plan: true,
      creditsThisMonth: true,
      revisionsThisMonth: true,
      crawlsThisMonth: true,
      websiteEditsThisMonth: true,
      newsSearchesThisMonth: true,
      newsletterEmailsThisMonth: true,
      billingPeriodStart: true,
      user: { select: { email: true } },
    },
  })
  if (!campaign) return { ok: false, error: "Campaign not found." }

  const mailing = {
    street: campaign.mailingStreet,
    street2: campaign.mailingStreet2,
    city: campaign.mailingCity,
    state: campaign.mailingState,
    zip: campaign.mailingZip,
  }
  if (!hasMailingAddress(mailing)) {
    return { ok: false, error: "Add a complete mailing address in Settings before sending (required by law in every email)." }
  }

  // Content blocks: the issue's blocks, or legacy plain-text body as one text block.
  const blocks =
    Array.isArray(newsletter.blocks) && newsletter.blocks.length > 0
      ? newsletter.blocks
      : newsletter.body?.trim()
        ? [{ id: "legacy", type: "text", props: { body: newsletter.body } }]
        : []

  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: { campaignId, status: "active" },
    select: { id: true, email: true, unsubscribeToken: true },
  })
  if (subscribers.length === 0) return { ok: false, error: "You have no confirmed subscribers yet." }

  // Meter up front (all-or-nothing against the monthly cap).
  const plan = toPlanId(campaign.plan)
  const consumed = await consumeNewsletterEmails(plan, campaign, subscribers.length)
  if (!consumed.ok) {
    const { remaining } = newsletterHeadroom(plan, campaign)
    return {
      ok: false,
      limitHit: true,
      error: `This issue has ${subscribers.length} subscribers but you have ${remaining ?? 0} newsletter emails left this month.`,
    }
  }

  const fromName = sanitizeName(campaign.committeeName || campaign.candidateName) || "Newsletter"
  const from = `${fromName} <${SEND_ADDRESS}>`
  const replyTo = campaign.user?.email || undefined
  const base = baseUrl()
  const headshotUrl = campaign.headshotMime ? `${base}/api/website/headshot/${campaign.id}` : null

  function ctxFor(unsubscribeUrl: string): EmailRenderCtx {
    return {
      subject: newsletter!.subject,
      candidateName: campaign!.candidateName,
      committeeName: campaign!.committeeName,
      campaignId: campaign!.id,
      mailing,
      unsubscribeUrl,
      headshotUrl,
      baseUrl: base,
    }
  }

  let sent = 0
  let failed = 0
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const chunk = subscribers.slice(i, i + BATCH_SIZE)
    const messages = chunk.map((sub) => {
      const unsubscribeUrl = `${base}/newsletter/unsubscribe?token=${sub.unsubscribeToken}`
      return {
        from,
        to: sub.email,
        replyTo,
        subject: newsletter.subject,
        html: renderNewsletterEmail(newsletter.template ?? campaign.newsletterTemplate, blocks, ctxFor(unsubscribeUrl)),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [
          { name: "sid", value: sub.id },
          { name: "nid", value: newsletter.id },
        ],
      }
    })

    try {
      const { error } = await resend.batch.send(messages)
      if (error) {
        failed += chunk.length
        console.error("[newsletterSend] batch error:", error)
      } else {
        sent += chunk.length
      }
    } catch (e) {
      failed += chunk.length
      console.error("[newsletterSend] batch threw:", e)
    }

    if (i + BATCH_SIZE < subscribers.length) await sleep(BATCH_DELAY_MS)
  }

  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { sentAt: new Date(), recipientCount: sent },
  })

  return { ok: true, sent, failed, total: subscribers.length }
}
