import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { ContextManager } from "@/components/communications/ContextManager"

export default async function ContextPage() {
  const { committee } = await requireActiveCampaign()

  const [contextItems, topics] = await Promise.all([
    prisma.contextItem.findMany({
      where: { committeeId: committee.id },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    prisma.topic.findMany({
      where: { committeeId: committee.id },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ])

  return (
    <ContextManager
      contextItems={contextItems.map((c) => ({
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
      topics={topics}
    />
  )
}
