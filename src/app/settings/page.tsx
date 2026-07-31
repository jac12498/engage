import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SettingsForm } from "@/components/settings/SettingsForm"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      plan: true,
      candidateName: true,
      office: true,
      party: true,
      additionalParties: true,
      committeeName: true,
      mailingStreet: true,
      mailingStreet2: true,
      mailingCity: true,
      mailingState: true,
      mailingZip: true,
      headshotMime: true,
      district: true,
      districtVoterCount: true,
      state: true,
    },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Campaign settings</h1>
          <p className="mt-1 text-muted-foreground">
            Update your candidate profile. These details appear across your workspace, generated
            communications, and published website.
          </p>
        </div>

        <div className="mt-8">
          <SettingsForm
            campaignId={campaign.id}
            hasHeadshot={!!campaign.headshotMime}
            initial={{
              candidateName: campaign.candidateName,
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
