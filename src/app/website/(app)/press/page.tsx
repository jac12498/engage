import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PressReview, type PressRow } from "@/components/website/PressReview"

export const dynamic = "force-dynamic"

export const metadata = { title: "Press coverage · Engage Campaign" }

export default async function PressPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) redirect("/onboarding")

  const clips = await prisma.newsClip.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
  })

  const rows: PressRow[] = clips.map((c) => ({
    id: c.id,
    headline: c.headline,
    url: c.url,
    outlet: c.outlet,
    summary: c.summary,
    publishedAt: c.publishedAt ? c.publishedAt.toISOString() : null,
    source: c.source,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
  }))

  return <PressReview clips={rows} />
}
