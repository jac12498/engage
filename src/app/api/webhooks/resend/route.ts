import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Resend delivery webhooks (bounces + spam complaints). On a hard bounce or a
// complaint we stop mailing that subscriber, which protects the fresh sending
// domain's reputation. Each send carries a `sid` tag (the subscriber id) so we can
// resolve the exact subscriber without guessing by email (emails aren't unique
// across campaigns). Signatures are verified with Resend's Svix scheme.

const SECRET = process.env.RESEND_WEBHOOK_SECRET || ""

/** Verify a Svix-signed webhook (as Resend sends). Returns true when valid. */
function verify(payload: string, headers: Headers): boolean {
  if (!SECRET) return false
  const id = headers.get("svix-id")
  const timestamp = headers.get("svix-timestamp")
  const sigHeader = headers.get("svix-signature")
  if (!id || !timestamp || !sigHeader) return false

  const key = Buffer.from(SECRET.replace(/^whsec_/, ""), "base64")
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64")
  const expectedBuf = Buffer.from(expected)

  // Header is a space-separated list of `v1,<signature>` entries.
  return sigHeader.split(" ").some((part) => {
    const sig = part.split(",")[1]
    if (!sig) return false
    const sigBuf = Buffer.from(sig)
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })
}

/** Pull the `sid` tag from a webhook payload (tags may be an array or an object map). */
function subscriberId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const tags = (data as { tags?: unknown }).tags
  if (Array.isArray(tags)) {
    const t = tags.find((x) => x && typeof x === "object" && (x as { name?: string }).name === "sid")
    const v = t && (t as { value?: unknown }).value
    return typeof v === "string" ? v : null
  }
  if (tags && typeof tags === "object") {
    const v = (tags as Record<string, unknown>).sid
    return typeof v === "string" ? v : null
  }
  return null
}

export async function POST(req: Request) {
  const payload = await req.text()
  if (!verify(payload, req.headers)) {
    return new Response("Invalid signature", { status: 401 })
  }

  let event: { type?: string; data?: unknown }
  try {
    event = JSON.parse(payload)
  } catch {
    return new Response("Bad payload", { status: 400 })
  }

  const type = event.type
  const status =
    type === "email.bounced" ? "bounced" : type === "email.complained" ? "complained" : null

  // Only act on hard bounces / complaints; acknowledge everything else.
  if (!status) return Response.json({ ok: true })

  const sid = subscriberId(event.data)
  if (sid) {
    // Idempotent: never re-flag an already-unsubscribed opt-out.
    await prisma.newsletterSubscriber.updateMany({
      where: { id: sid, status: { notIn: ["unsubscribed"] } },
      data: { status, unsubscribedAt: new Date(), confirmToken: null },
    })
  }

  return Response.json({ ok: true })
}
