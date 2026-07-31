import "server-only"
import { prisma } from "@/lib/prisma"
import { resend } from "@/lib/email"
import { toPlanId } from "@/lib/entitlements"
import { consumeNewsletterEmails, newsletterHeadroom } from "@/lib/comms/usage"

// Phase 3: email a published newsletter to a campaign's active subscribers.
// Reuses the Phase 1 subscriber list + permanent unsubscribeToken; sends in
// batches of 100 via Resend with a per-recipient one-click List-Unsubscribe
// header and a CAN-SPAM footer. Send-once (guards on newsletter.sentAt).

/** Bulk sends go from the party-neutral, reputation-isolated newsletter subdomain. */
const SEND_ADDRESS = process.env.NEWSLETTER_FROM_ADDRESS || "news@news.engageamplify.com"
const BATCH_SIZE = 100
// Resend's default rate limit is ~2 requests/sec; pace batch calls under it.
const BATCH_DELAY_MS = 600

function baseUrl(): string {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Header display names can't contain commas/quotes/newlines — strip them. */
function sanitizeName(s: string): string {
  return s.replace(/["\r\n,]/g, " ").replace(/\s+/g, " ").trim()
}

/** Plain-text body (blank lines = paragraphs) → escaped HTML paragraphs. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#1a1a2e;font-size:16px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`
    )
    .join("")
}

interface MailingAddress {
  mailingStreet: string | null
  mailingStreet2: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
}

interface RenderCampaign extends MailingAddress {
  candidateName: string
  committeeName: string | null
  website: string | null
}

/** Compose the US postal components into a single footer line. */
function composeAddress(c: MailingAddress): string {
  const line1 = [c.mailingStreet, c.mailingStreet2].map((s) => s?.trim()).filter(Boolean).join(", ")
  const cityStateZip = [
    c.mailingCity?.trim(),
    [c.mailingState?.trim(), c.mailingZip?.trim()].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ")
  return [line1, cityStateZip].filter(Boolean).join(", ")
}

/** True only when we have a complete enough address to satisfy CAN-SPAM. */
function hasMailingAddress(c: MailingAddress): boolean {
  return Boolean(c.mailingStreet?.trim() && c.mailingCity?.trim() && c.mailingState?.trim() && c.mailingZip?.trim())
}

export function renderNewsletterHtml(
  campaign: RenderCampaign,
  newsletter: { subject: string; body: string },
  unsubscribeUrl: string
): string {
  const paidFor = campaign.committeeName ? `Paid for by ${escapeHtml(campaign.committeeName)}. ` : ""
  const addr = escapeHtml(composeAddress(campaign))
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;padding:8px 4px">
  <h1 style="font-size:22px;color:#1a1a2e;margin:0 0 20px">${escapeHtml(newsletter.subject)}</h1>
  ${bodyToHtml(newsletter.body)}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px">
  <p style="color:#8a8a99;font-size:12px;line-height:1.5;margin:0 0 8px">
    ${paidFor}${addr}
  </p>
  <p style="color:#8a8a99;font-size:12px;line-height:1.5;margin:0">
    You're receiving this because you subscribed to ${escapeHtml(campaign.candidateName)}'s newsletter.
    <a href="${unsubscribeUrl}" style="color:#1b3a6b">Unsubscribe</a>.
  </p>
</div>`
}

export type SendResult =
  | { ok: true; sent: number; failed: number; total: number }
  | { ok: false; error: string; limitHit?: boolean }

/**
 * Send a published newsletter to all `active` subscribers. Idempotent-guarded by
 * `newsletter.sentAt` (won't re-send). Meters recipient-emails against the plan cap
 * BEFORE sending (all-or-nothing). Records `sentAt` + `recipientCount` on success.
 */
export async function sendNewsletterNow(campaignId: string, newsletterId: string): Promise<SendResult> {
  const newsletter = await prisma.newsletter.findFirst({
    where: { id: newsletterId, campaignId },
    select: { id: true, subject: true, body: true, status: true, sentAt: true },
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
      website: true,
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
  if (!hasMailingAddress(campaign)) {
    return { ok: false, error: "Add a complete mailing address in Settings before sending (required by law in every email)." }
  }

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
        html: renderNewsletterHtml(campaign, newsletter, unsubscribeUrl),
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

  // Record the send. recipientCount reflects accepted messages.
  await prisma.newsletter.update({
    where: { id: newsletter.id },
    data: { sentAt: new Date(), recipientCount: sent },
  })

  return { ok: true, sent, failed, total: subscribers.length }
}
