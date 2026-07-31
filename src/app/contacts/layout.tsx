import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/AppHeader"

export const metadata = { title: "Contacts · Engage" }

export default async function ContactsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true, candidateName: true, committeeName: true, headshotMime: true },
  })
  if (!campaign) redirect("/onboarding")

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <AppHeader campaign={campaign} module={{ id: "contacts", name: "Contacts" }} />
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}
