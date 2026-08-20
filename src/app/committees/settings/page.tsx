import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { requireCommittee } from "@/lib/context"
import { CommitteeOnboardingForm } from "@/components/onboarding/CommitteeOnboardingForm"
import { updateActiveCommittee } from "@/app/committees/actions"
import { isJurisdiction } from "@/lib/committeeTypes"

export const dynamic = "force-dynamic"
export const metadata = { title: "Committee settings · Engage" }

export default async function CommitteeSettingsPage() {
  // Committee-wide registration config — admin+ only.
  const { committee } = await requireCommittee("admin")

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <Link
          href="/committees"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Committees
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Committee settings</h1>
        <p className="mt-1 text-muted-foreground">
          Your committee&rsquo;s registration details. The filer ID lets us match your donors and
          registry record.
        </p>

        <CommitteeOnboardingForm
          submitAction={updateActiveCommittee}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          savedLabel="Saved"
          initial={{
            jurisdiction: isJurisdiction(committee.jurisdiction) ? committee.jurisdiction : "state",
            state: committee.state ?? "",
            committeeType: committee.committeeType ?? "",
            name: committee.name,
            filerId: committee.filerId ?? "",
          }}
        />
      </div>
    </AppShell>
  )
}
