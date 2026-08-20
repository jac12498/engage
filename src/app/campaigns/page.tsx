import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { requireCommittee } from "@/lib/context"
import { prisma } from "@/lib/prisma"
import { CampaignsList, type CampaignCard } from "@/components/candidates/CampaignsList"

export const dynamic = "force-dynamic"
export const metadata = { title: "Campaigns · Engage" }

export default async function CampaignsPage() {
  const ctx = await requireCommittee()
  if (!ctx.candidate) redirect("/candidates/new")

  const campaigns = await prisma.campaign.findMany({
    where: { candidateId: ctx.candidate.id },
    orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
    select: { id: true, cycle: true, office: true, party: true },
  })

  const rows: CampaignCard[] = campaigns.map((c) => ({
    id: c.id,
    cycle: c.cycle,
    office: c.office,
    party: c.party,
  }))

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Campaigns</h1>
        <p className="mt-1 text-muted-foreground">
          The runs for <span className="font-medium text-[#1a1a2e]">{ctx.candidate.candidateName}</span> — one per cycle.
          Each has its own communications, news, and newsletters. Switch to a run to work on it.
        </p>

        <div className="mt-8">
          <CampaignsList
            campaigns={rows}
            activeId={ctx.campaign?.id ?? null}
            canManage={ctx.permissions.has("campaigns:manage")}
          />
        </div>
      </div>
    </AppShell>
  )
}
