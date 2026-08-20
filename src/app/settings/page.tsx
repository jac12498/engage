import { AppShell } from "@/components/AppShell"
import { requireActiveCampaign } from "@/lib/context"
import { SettingsForm } from "@/components/settings/SettingsForm"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const { candidate, campaign } = await requireActiveCampaign()

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

        <div className="mt-8">
          <SettingsForm
            campaignId={candidate.id}
            hasHeadshot={!!candidate.headshotMime}
            initial={{
              candidateName: candidate.candidateName,
              office: campaign.office,
              party: campaign.party ?? "",
              additionalParties: campaign.additionalParties,
              committeeName: campaign.committeeName ?? "",
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
