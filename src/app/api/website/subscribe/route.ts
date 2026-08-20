import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/email"
import { NEWSLETTER_SUBSCRIBER_LIMITS, toPlanId } from "@/lib/entitlements"

// Public, unauthenticated: the newsletter signup form on a published candidate site.
// Double opt-in — a signup is filed as `pending` and a confirmation link is emailed;
// the subscriber becomes `active` only after clicking it.

function baseUrl(req: Request): string {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || new URL(req.url).origin
}

function confirmEmailHtml(siteName: string, confirmUrl: string): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
  <h2 style="font-size:20px">Confirm your subscription</h2>
  <p style="color:#444;line-height:1.55">Please confirm that you'd like to receive ${siteName}'s newsletter at this email address.</p>
  <p style="margin:24px 0">
    <a href="${confirmUrl}" style="display:inline-block;background:#1b3a6b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600;font-size:14px">Confirm subscription</a>
  </p>
  <p style="color:#777;font-size:13px;line-height:1.5">If the button doesn't work, paste this link into your browser:<br><a href="${confirmUrl}" style="color:#1b3a6b">${confirmUrl}</a></p>
  <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email — you won't be subscribed.</p>
</div>`
}

export async function POST(req: Request) {
  let body: { committeeId?: string; email?: string; name?: string }
  try {
    body = await req.json()
  } catch {
    return new Response("Bad request", { status: 400 })
  }

  const committeeId = typeof body.committeeId === "string" ? body.committeeId : ""
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : ""

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return new Response("A valid email is required.", { status: 400 })
  }

  // The signup form posts the committee id (the site is committee-owned). Only accept
  // signups when the committee has a published site.
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { name: true, plan: true, site: { select: { published: true } } },
  })
  if (!committee || !committee.site?.published) return new Response("Not found", { status: 404 })

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { committeeId_email: { committeeId, email } },
  })

  // Already confirmed — succeed silently (don't reveal status, don't re-email).
  if (existing && existing.status === "active") return Response.json({ ok: true })

  // Volume gate: a brand-new sign-up can't push the list past the plan's cap
  // (existing subscribers re-confirming/re-subscribing are always allowed).
  if (!existing) {
    const cap = NEWSLETTER_SUBSCRIBER_LIMITS[toPlanId(committee.plan)]
    if (cap != null) {
      const listSize = await prisma.newsletterSubscriber.count({
        where: { committeeId, status: { in: ["active", "pending"] } },
      })
      if (listSize >= cap) {
        return new Response("This newsletter isn't accepting new sign-ups right now.", { status: 403 })
      }
    }
  }

  const confirmToken = randomUUID()
  if (existing) {
    await prisma.newsletterSubscriber.update({
      where: { id: existing.id },
      data: { status: "pending", confirmToken, name: name || existing.name, unsubscribedAt: null },
    })
  } else {
    await prisma.newsletterSubscriber.create({
      data: {
        committeeId,
        email,
        name: name || null,
        status: "pending",
        confirmToken,
        unsubscribeToken: randomUUID(),
      },
    })
  }

  const confirmUrl = `${baseUrl(req)}/newsletter/confirm?token=${confirmToken}`
  try {
    await sendMail({
      to: email,
      subject: `Confirm your subscription to ${committee.name}'s newsletter`,
      html: confirmEmailHtml(committee.name, confirmUrl),
    })
  } catch (e) {
    console.error("[subscribe] confirmation email failed:", e)
    return new Response("Could not send the confirmation email. Please try again.", { status: 500 })
  }

  return Response.json({ ok: true })
}
