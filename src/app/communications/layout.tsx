import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/AppHeader"
import { CommsSidebar } from "@/components/communications/CommsSidebar"

export const metadata = { title: "AI Communications · Engage" }

export default async function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true, candidateName: true, committeeName: true, headshotMime: true },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader campaign={campaign} module={{ id: "ai-communications", name: "AI Communications" }} />
      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <CommsSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
