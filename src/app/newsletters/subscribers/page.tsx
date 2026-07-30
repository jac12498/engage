import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NEWSLETTER_SUBSCRIBER_LIMITS, toPlanId } from "@/lib/entitlements"
import { SubscribersManager, type SubscriberRow } from "@/components/website/SubscribersManager"

export const dynamic = "force-dynamic"

export const metadata = { title: "Newsletter subscribers · Engage" }

export default async function SubscribersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true, plan: true },
  })
  if (!campaign) redirect("/onboarding")

  const subscriberLimit = NEWSLETTER_SUBSCRIBER_LIMITS[toPlanId(campaign.plan)]

  const subs = await prisma.newsletterSubscriber.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, status: true, source: true, createdAt: true, confirmedAt: true },
  })

  const rows: SubscriberRow[] = subs.map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    status: s.status,
    source: s.source,
    createdAt: s.createdAt.toISOString(),
    confirmedAt: s.confirmedAt ? s.confirmedAt.toISOString() : null,
  }))

  return <SubscribersManager subscribers={rows} subscriberLimit={subscriberLimit} />
}
