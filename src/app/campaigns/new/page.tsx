import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { requirePrivilege } from "@/lib/context"
import { getTopLevelDistricts } from "@/lib/districts"
import { CampaignRunForm } from "@/components/candidates/CampaignRunForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Add a campaign · Engage" }

export default async function NewCampaignPage() {
  // Adding a run is structural — requires the campaigns-manage privilege.
  const ctx = await requirePrivilege("campaigns:manage")
  if (!ctx.candidate) redirect("/candidates/new")
  const topDistricts = await getTopLevelDistricts()

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Campaigns
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[#1a1a2e]">Add a campaign</h1>
        <p className="mt-1.5 text-muted-foreground">
          Add a run for <span className="font-medium text-[#1a1a2e]">{ctx.candidate.candidateName}</span>. Each run
          (cycle) has its own office, ballot line, communications, news, and newsletters.
        </p>

        <CampaignRunForm
          topDistricts={topDistricts}
          committeeState={ctx.committee.state ?? "NY"}
          candidateName={ctx.candidate.candidateName}
        />
      </div>
    </AppShell>
  )
}
