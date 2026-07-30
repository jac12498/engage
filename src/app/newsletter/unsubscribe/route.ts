import { prisma } from "@/lib/prisma"
import { statusResponse } from "@/lib/statusResponse"

export const dynamic = "force-dynamic"

// Public one-click unsubscribe (CAN-SPAM). The unsubscribeToken is permanent and
// embedded in the footer of every newsletter send.

/** Flip the subscriber to unsubscribed (idempotent). Returns whether the token matched. */
async function applyUnsubscribe(token: string): Promise<boolean> {
  const sub = token
    ? await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } })
    : null
  if (!sub) return false
  if (sub.status !== "unsubscribed") {
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: "unsubscribed", unsubscribedAt: new Date(), confirmToken: null },
    })
  }
  return true
}

// Human click from the email footer → branded confirmation page.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? ""
  const ok = await applyUnsubscribe(token)
  if (!ok) return statusResponse("Link invalid", "This unsubscribe link is invalid.", false)
  return statusResponse(
    "Unsubscribed",
    "You've been removed from this newsletter and won't receive further emails.",
    true,
  )
}

// RFC 8058 one-click unsubscribe: mailbox providers (Gmail/Yahoo) POST here directly
// from the List-Unsubscribe header with no user interaction. Must return 2xx.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? ""
  await applyUnsubscribe(token)
  return new Response(null, { status: 200 })
}
