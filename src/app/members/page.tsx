import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast } from "@/lib/context"
import { MembersManager, type MemberRow } from "@/components/members/MembersManager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Members · Engage" }

export default async function MembersPage() {
  const ctx = await getActiveContext()
  if (!ctx) redirect("/onboarding")
  // Admins and owners manage members; everyone else has no business here.
  if (!roleAtLeast(ctx.role, "admin")) redirect("/dashboard")

  const memberships = await prisma.committeeMembership.findMany({
    where: { committeeId: ctx.committee.id },
    select: {
      role: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, emailVerified: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const members: MemberRow[] = memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    pending: !m.user.emailVerified, // invited but hasn't signed in yet
    joinedAt: m.createdAt.toISOString(),
  }))

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Members</h1>
        <p className="mt-1 text-muted-foreground">
          People who can access <span className="font-medium text-[#1a1a2e]">{ctx.committee.name}</span>.
          Roles control what each person can see and do.
        </p>
      </div>

      <div className="mt-8">
        <MembersManager
          members={members}
          currentUserId={ctx.userId}
          currentRole={ctx.role}
        />
      </div>
    </AppShell>
  )
}
