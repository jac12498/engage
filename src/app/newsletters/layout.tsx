import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId, PLAN_LABELS } from "@/lib/entitlements"
import { AppHeader } from "@/components/AppHeader"

export const metadata = { title: "Newsletter · Engage Campaign" }

export default async function NewsletterLayout({ children }: { children: React.ReactNode }) {
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
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  )
}
