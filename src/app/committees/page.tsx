import { redirect } from "next/navigation"

// The committee switcher/create now lives on the Committee Settings hub.
export default function CommitteesPage() {
  redirect("/committees/settings")
}
