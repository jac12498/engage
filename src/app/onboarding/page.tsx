import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTopLevelDistricts } from "@/lib/districts"
import { OnboardingForm } from "@/components/onboarding/OnboardingForm"

export const metadata = { title: "Set up your campaign · Engage Campaign" }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  // Authoritative gate: read the DB, not the (possibly stale) JWT.
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (campaign) redirect("/")

  const topDistricts = await getTopLevelDistricts()

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-2 px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
            E
          </span>
          <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage Campaign</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Set up your campaign</h1>
        <p className="mt-1.5 text-muted-foreground">
          A few details about you and your campaign. This powers your AI Communications and ties your
          workspace to the right voters.
        </p>

        <OnboardingForm topDistricts={topDistricts} />
      </main>
    </div>
  )
}
