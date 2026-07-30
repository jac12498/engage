import { redirect } from "next/navigation"
import { AppHeader } from "@/components/AppHeader"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PLAN_LABELS, toPlanId } from "@/lib/entitlements"
import { SettingsForm } from "@/components/settings/SettingsForm"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      plan: true,
      candidateName: true,
      office: true,
      party: true,
      committeeName: true,
      mailingAddress: true,
      district: true,
      districtVoterCount: true,
      state: true,
    },
  })
  if (!campaign) redirect("/onboarding")

  const plan = toPlanId(campaign.plan)

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader planLabel={PLAN_LABELS[plan]} />

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Campaign settings</h1>
          <p className="mt-1 text-muted-foreground">
            Update your candidate profile. These details appear across your workspace, generated
            communications, and published website.
          </p>
        </div>

        <div className="mt-8">
          <SettingsForm
            initial={{
              candidateName: campaign.candidateName,
              office: campaign.office,
              party: campaign.party ?? "",
              committeeName: campaign.committeeName ?? "",
              mailingAddress: campaign.mailingAddress ?? "",
            }}
            district={{
              name: campaign.district,
              state: campaign.state,
              voterCount: campaign.districtVoterCount,
            }}
          />
        </div>
      </main>
    </div>
  )
}
