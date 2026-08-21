import { redirect } from "next/navigation"

// The candidate switcher/add now lives on the Candidate Settings hub.
export default function CandidatesPage() {
  redirect("/settings")
}
