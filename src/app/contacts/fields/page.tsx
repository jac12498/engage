import { requirePrivilege } from "@/lib/context"
import { getContactFields } from "@/lib/committeeFields"
import { FieldManager } from "@/components/contacts/FieldManager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Contact fields · Engage" }

export default async function FieldsPage() {
  const { committee } = await requirePrivilege("contacts:update")
  const fields = await getContactFields(committee.id)
  return <FieldManager fields={fields} />
}
