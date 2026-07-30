import { prisma } from "@/lib/prisma"
import { statusResponse } from "@/lib/statusResponse"

export const dynamic = "force-dynamic"

// Public one-click unsubscribe (CAN-SPAM). The unsubscribeToken is permanent and
// embedded in the footer of every newsletter send.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? ""
  const sub = token
    ? await prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } })
    : null

  if (!sub) {
    return statusResponse("Link invalid", "This unsubscribe link is invalid.", false)
  }

  if (sub.status !== "unsubscribed") {
    await prisma.newsletterSubscriber.update({
      where: { id: sub.id },
      data: { status: "unsubscribed", unsubscribedAt: new Date(), confirmToken: null },
    })
  }

  return statusResponse(
    "Unsubscribed",
    "You've been removed from this newsletter and won't receive further emails.",
    true,
  )
}
