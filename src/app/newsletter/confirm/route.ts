import { prisma } from "@/lib/prisma"
import { statusResponse } from "@/lib/statusResponse"

export const dynamic = "force-dynamic"

// Public double opt-in confirmation. The token is single-use: once confirmed it's
// cleared, so re-clicking the link falls through to the "already confirmed" path.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? ""
  const sub = token
    ? await prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } })
    : null

  if (!sub) {
    return statusResponse(
      "Link expired",
      "This confirmation link is invalid or has already been used. If you already confirmed, you're all set.",
      false,
    )
  }

  await prisma.newsletterSubscriber.update({
    where: { id: sub.id },
    data: { status: "active", confirmedAt: new Date(), confirmToken: null },
  })

  return statusResponse(
    "You're subscribed!",
    "Thanks for confirming. You'll receive the newsletter at this email address.",
    true,
  )
}
