import { prisma } from "@/lib/prisma"
import { requireCommittee } from "@/lib/context"
import { SignupsReview, type SignupRow } from "@/components/contacts/SignupsReview"

export const dynamic = "force-dynamic"

export default async function SignupsPage() {
  const { committee } = await requireCommittee()

  const signups = await prisma.volunteerSignup.findMany({
    where: { website: { campaign: { committeeId: committee.id } } },
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
