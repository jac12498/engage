import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SignupsReview, type SignupRow } from "@/components/contacts/SignupsReview"

export const dynamic = "force-dynamic"

export default async function SignupsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) redirect("/onboarding")

  const signups = await prisma.volunteerSignup.findMany({
    where: { website: { campaignId: campaign.id } },
    orderBy: [{ createdAt: "desc" }],
  })

  const rows: SignupRow[] = signups.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    message: s.message,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    contactId: s.contactId,
  }))

  return <SignupsReview signups={rows} />
}
