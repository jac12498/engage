import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/AppHeader"

export const metadata = { title: "Candidate Website · Engage" }

export default async function WebsiteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true, candidateName: true, committeeName: true, headshotMime: true },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader campaign={campaign} module={{ id: "candidate-websites", name: "Candidate Website" }} />
      <div className="mx-auto max-w-4xl px-6 py-8">{children}</div>
    </div>
  )
}
