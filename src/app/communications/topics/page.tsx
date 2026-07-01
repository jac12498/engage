import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TopicsManager } from "@/components/communications/TopicsManager"

export default async function TopicsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
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
