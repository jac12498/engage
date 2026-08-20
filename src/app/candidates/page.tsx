import { AppShell } from "@/components/AppShell"
import { requireCommittee } from "@/lib/context"
import { prisma } from "@/lib/prisma"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { CandidatesList, type CandidateCard } from "@/components/candidates/CandidatesList"

export const dynamic = "force-dynamic"
export const metadata = { title: "Candidates · Engage" }

export default async function CandidatesPage() {
  const ctx = await requireCommittee()

  const candidates = await prisma.candidate.findMany({
    where: { committeeId: ctx.committee.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      candidateName: true,
      // Show the latest run's office/ballot line as the candidate's summary.
      campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { office: true, party: true } },
    },
  })

  const rows: CandidateCard[] = candidates.map((c) => ({
    id: c.id,
    candidateName: c.candidateName,
    office: c.campaigns[0]?.office ?? "",
    party: c.campaigns[0]?.party ?? null,
  }))

  const canAdd =
    ctx.permissions.has("campaigns:manage") &&
    (allowsMultipleCandidates(ctx.committee.committeeType) || candidates.length === 0)

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidates</h1>
        <p className="mt-1 text-muted-foreground">
          The candidates under <span className="font-medium text-[#1a1a2e]">{ctx.committee.name}</span>. Open one
          to work on their communications, website, and newsletter.
        </p>

        <div className="mt-8">
          <CandidatesList
            candidates={rows}
            activeId={ctx.candidate?.id ?? null}
            canAdd={canAdd}
            canManage={ctx.permissions.has("campaigns:manage")}
          />
        </div>
      </div>
    </AppShell>
  )
}
