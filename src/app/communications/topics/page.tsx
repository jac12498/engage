import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { TopicsManager } from "@/components/communications/TopicsManager"

export default async function TopicsPage() {
  const { campaign: active } = await requireActiveCampaign()

  const campaign = await prisma.campaign.findUnique({
    where: { id: active.id },
    include: { topics: { orderBy: { updatedAt: "desc" } } },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <TopicsManager
      topics={campaign.topics.map((t) => ({
        id: t.id,
        title: t.title,
        keyMessage: t.keyMessage,
        targetAudience: t.targetAudience,
        occasion: t.occasion,
        talkingPoints: t.talkingPoints,
      }))}
    />
  )
}
