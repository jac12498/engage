import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { ContextManager } from "@/components/communications/ContextManager"

export default async function ContextPage() {
  const { campaign: active } = await requireActiveCampaign()

  const campaign = await prisma.campaign.findUnique({
    where: { id: active.id },
    include: {
      contextItems: { orderBy: [{ type: "asc" }, { createdAt: "asc" }] },
      topics: { orderBy: { title: "asc" }, select: { id: true, title: true } },
    },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <ContextManager
      contextItems={campaign.contextItems.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title,
        body: c.body,
        keyPoints: c.keyPoints,
        url: c.url,
        source: c.source,
        refType: c.refType,
        topicId: c.topicId,
      }))}
      topics={campaign.topics}
    />
  )
}
