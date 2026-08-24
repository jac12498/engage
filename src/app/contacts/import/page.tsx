import { requirePrivilege } from "@/lib/context"
import { getContactFields } from "@/lib/committeeFields"
import { ImportContacts } from "@/components/contacts/ImportContacts"

export const dynamic = "force-dynamic"
// Large imports can run longer than the default; raise the segment budget for the
// import server actions (honored on platforms that enforce a function timeout).
export const maxDuration = 300
export const metadata = { title: "Load a contact list · Engage" }

export default async function ImportContactsPage() {
  // Gate the page on the same privilege the import action checks.
  const { committee } = await requirePrivilege("contacts:create")
  const fields = await getContactFields(committee.id)
  return <ImportContacts customFields={fields} />
}
