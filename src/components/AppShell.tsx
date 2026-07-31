import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toPlanId } from "@/lib/entitlements"
import { AppSidebar } from "./AppSidebar"

/**
 * Authenticated workspace shell: the persistent left sidebar (module navigation +
 * identity + account) around the page content. Self-contains the auth gate, so
 * each authed layout/page just wraps its content in <AppShell>.
 */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      candidateName: true,
      committeeName: true,
      headshotMime: true,
      plan: true,
    },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppSidebar campaign={campaign} plan={toPlanId(campaign.plan)} />
      <div className="md:pl-60">
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
