import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ContextManager } from "@/components/communications/ContextManager"

export default async function ContextPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
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
