import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NewslettersManager, type NewsletterRow } from "@/components/website/NewslettersManager"

export const dynamic = "force-dynamic"

export const metadata = { title: "Newsletters · Engage Campaign" }

export default async function NewslettersPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) redirect("/onboarding")

  const [items, activeSubscribers] = await Promise.all([
    prisma.newsletter.findMany({
      where: { campaignId: campaign.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, subject: true, status: true, updatedAt: true, publishedAt: true },
    }),
    prisma.newsletterSubscriber.count({ where: { campaignId: campaign.id, status: "active" } }),
  ])

  const rows: NewsletterRow[] = items.map((n) => ({
    id: n.id,
    subject: n.subject,
    status: n.status,
    updatedAt: n.updatedAt.toISOString(),
    publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
  }))

  return <NewslettersManager newsletters={rows} activeSubscribers={activeSubscribers} />
}
