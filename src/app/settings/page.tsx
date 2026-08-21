import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { SettingsForm } from "@/components/settings/SettingsForm"
import { CandidatesList, type CandidateCard } from "@/components/candidates/CandidatesList"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { committee, candidate, campaign, permissions } = await requireActiveCampaign()

  // Candidate selector/add — shown when the committee can hold (or already holds)
  // more than one candidate; a single-candidate committee has nothing to switch/add.
  const canManage = permissions.has("campaigns:manage")
  const candidates = await prisma.candidate.findMany({
    where: { committeeId: committee.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      candidateName: true,
      campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { office: true, party: true } },
    },
  })
  const canAdd = canManage && (allowsMultipleCandidates(committee.committeeType) || candidates.length === 0)
  const showSelector = canAdd || candidates.length > 1
  const candidateRows: CandidateCard[] = candidates.map((c) => ({
    id: c.id,
    candidateName: c.candidateName,
    office: c.campaigns[0]?.office ?? "",
    party: c.campaigns[0]?.party ?? null,
  }))

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidate settings</h1>
          <p className="mt-1 text-muted-foreground">
            Update your candidate profile and current run. These details appear across your
            workspace, generated communications, and published website.
          </p>
        </div>

        {showSelector && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose whose settings to edit, or add a candidate.
            </p>
            <div className="mt-4">
              <CandidatesList
                candidates={candidateRows}
                activeId={candidate.id}
                canAdd={canAdd}
                canManage={canManage}
              />
            </div>
          </div>
        )}

        <div className="mt-8">
          <SettingsForm
            key={candidate.id}
            campaignId={candidate.id}
            hasHeadshot={!!candidate.headshotMime}
            hasLogo={!!candidate.logoMime}
            initial={{
              candidateName: candidate.candidateName,
              office: campaign.office,
              party: campaign.party ?? "",
              committeeName: campaign.committeeName ?? "",
              slogan: candidate.tagline ?? "",
              website: candidate.website ?? "",
              actblueUrl: candidate.actblueUrl ?? "",
              mailingStreet: campaign.mailingStreet ?? "",
              mailingStreet2: campaign.mailingStreet2 ?? "",
              mailingCity: campaign.mailingCity ?? "",
              mailingState: campaign.mailingState ?? "",
              mailingZip: campaign.mailingZip ?? "",
            }}
            district={{
              name: campaign.district,
              state: campaign.state,
              voterCount: campaign.districtVoterCount,
            }}
          />
        </div>
      </div>
    </AppShell>
  )
}
