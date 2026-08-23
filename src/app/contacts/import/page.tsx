import { requirePrivilege } from "@/lib/context"
import { ImportContacts } from "@/components/contacts/ImportContacts"

export const dynamic = "force-dynamic"
export const metadata = { title: "Load a contact list · Engage" }

export default async function ImportContactsPage() {
  // Gate the page on the same privilege the import action checks.
  await requirePrivilege("contacts:create")
  return <ImportContacts />
}
