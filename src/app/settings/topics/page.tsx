import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { TopicsManager } from "@/components/communications/TopicsManager"

export default async function TopicsPage() {
  const { committee } = await requireActiveCampaign()

  const topics = await prisma.topic.findMany({
    where: { committeeId: committee.id },
    orderBy: { updatedAt: "desc" },
  })

  return (
    <TopicsManager
      topics={topics.map((t) => ({
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
