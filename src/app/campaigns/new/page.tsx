import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { requireCommittee } from "@/lib/context"
import { getTopLevelDistricts } from "@/lib/districts"
import { CampaignForm } from "@/components/campaigns/CampaignForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Add a campaign · Engage" }

export default async function NewCampaignPage() {
  // Adding a race is structural — owners + admins only.
  const { committee } = await requireCommittee("admin")
  const topDistricts = await getTopLevelDistricts()

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to workspace
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-[#1a1a2e]">Add a campaign</h1>
        <p className="mt-1.5 text-muted-foreground">
          Add a candidate race to <span className="font-medium text-[#1a1a2e]">{committee.name}</span>.
          Each campaign gets its own Communications, website, and newsletter — switch between them any
          time from the sidebar.
        </p>

        <CampaignForm topDistricts={topDistricts} />
      </div>
    </AppShell>
  )
}
