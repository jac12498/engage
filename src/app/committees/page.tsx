import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { committeeTypeLabel } from "@/lib/committeeTypes"
import { CommitteePicker, type PickerCommittee } from "@/components/committees/CommitteePicker"

export const dynamic = "force-dynamic"
export const metadata = { title: "Committees · Engage" }

export default async function CommitteesPage() {
  const ctx = await getActiveContext()
  if (!ctx) redirect("/onboarding")

  const memberships = await prisma.committeeMembership.findMany({
    where: { userId: ctx.userId },
    select: {
      role: true,
      committee: {
        select: {
          id: true,
          name: true,
          state: true,
          committeeType: true,
          _count: { select: { candidates: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const committees: PickerCommittee[] = memberships.map((m) => ({
    id: m.committee.id,
    name: m.committee.name,
    role: m.role,
    typeLabel: committeeTypeLabel(m.committee.state, m.committee.committeeType),
    state: m.committee.state,
    campaignCount: m.committee._count.candidates,
  }))

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Committees</h1>
        <p className="mt-1 text-muted-foreground">
          Switch between the committees you belong to, or create a new one.
        </p>
      </div>

      <div className="mt-8">
        <CommitteePicker committees={committees} activeCommitteeId={ctx.committee.id} />
      </div>
    </AppShell>
  )
}
