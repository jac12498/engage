import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId, PLAN_LABELS } from "@/lib/entitlements"
import { AppHeader } from "@/components/AppHeader"
import { CommsSidebar } from "@/components/communications/CommsSidebar"

export const metadata = { title: "AI Communications · Engage Campaign" }

export default async function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { plan: true },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader planLabel={PLAN_LABELS[toPlanId(campaign.plan)]} />
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <CommsSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
