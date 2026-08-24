import { requirePrivilege } from "@/lib/context"
import { prisma } from "@/lib/prisma"
import { TagManager } from "@/components/contacts/TagManager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contact tags · Engage" }

export default async function TagsPage() {
  const { committee } = await requirePrivilege("contacts:update")
  const customTags = await prisma.committeeTag.findMany({
    where: { committeeId: committee.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, slug: true, label: true, color: true },
  })
  return <TagManager customTags={customTags} />
}
