import { requirePrivilege } from "@/lib/context"
import { loadDuplicateGroups } from "@/lib/contactsDuplicates"
import { DuplicatesReview } from "@/components/contacts/DuplicatesReview"

export const dynamic = "force-dynamic"
export const metadata = { title: "Review duplicates · Engage" }

export default async function DuplicatesPage() {
  // Viewing + dismissing needs contacts:update; merging additionally needs delete.
  const { committee, permissions } = await requirePrivilege("contacts:update")
  const groups = await loadDuplicateGroups(committee.id)
  return <DuplicatesReview groups={groups} canMerge={permissions.has("contacts:delete")} />
}
