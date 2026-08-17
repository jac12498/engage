import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { getActiveContext } from "@/lib/context"
import { CommitteeOnboardingForm } from "@/components/onboarding/CommitteeOnboardingForm"
import { submitAdditionalCommittee } from "@/app/committees/actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "New committee · Engage" }

export default async function NewCommitteePage() {
  // Any signed-in user with an existing committee can create another (they become
  // its owner). Users with none belong in onboarding.
  const ctx = await getActiveContext()
  if (!ctx) redirect("/onboarding")

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/committees"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to committees
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[#1a1a2e]">Create a new committee</h1>
        <p className="mt-1.5 text-muted-foreground">
          Set up another committee — you&rsquo;ll be its owner, and it becomes your active
          workspace. Add campaigns to it once it&rsquo;s created.
        </p>

        <CommitteeOnboardingForm submitAction={submitAdditionalCommittee} />
      </div>
    </AppShell>
  )
}
