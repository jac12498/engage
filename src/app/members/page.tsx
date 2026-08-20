import { AppShell } from "@/components/AppShell"
import { prisma } from "@/lib/prisma"
import { requirePrivilege } from "@/lib/context"
import { MembersManager, type MemberRow, type AssignableRole } from "@/components/members/MembersManager"
import { RolesManager, type RoleRow } from "@/components/members/RolesManager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Members · Engage" }

export default async function MembersPage() {
  // Only members with the "manage members" privilege belong here.
  const ctx = await requirePrivilege("members:manage")
  const committeeId = ctx.committee.id
  const canManageRoles = ctx.permissions.has("roles:manage")

  const [memberships, roles] = await Promise.all([
    prisma.committeeMembership.findMany({
      where: { committeeId },
      select: {
        role: true,
        roleTypeId: true,
        createdAt: true,
        roleType: { select: { id: true, label: true } },
        user: { select: { id: true, name: true, email: true, emailVerified: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    // Roles assignable in this committee: global built-ins + this committee's customs.
    prisma.roleType.findMany({
      where: { OR: [{ committeeId: null, isBuiltIn: true }, { committeeId }] },
      select: {
        id: true,
        label: true,
        description: true,
        isBuiltIn: true,
        permissions: { select: { permission: { select: { key: true } } } },
        _count: { select: { memberships: true } },
      },
      orderBy: [{ isBuiltIn: "desc" }, { label: "asc" }],
    }),
  ])

  const roleRows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    isBuiltIn: r.isBuiltIn,
    permissionKeys: r.permissions.map((p) => p.permission.key),
    memberCount: r._count.memberships,
  }))

  const assignableRoles: AssignableRole[] = roleRows.map((r) => ({
    id: r.id,
    label: r.label,
    isBuiltIn: r.isBuiltIn,
  }))
  const defaultRoleId = roles.find((r) => r.label === "Member")?.id ?? roles[0]?.id ?? ""

  const members: MemberRow[] = memberships.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    roleTypeId: m.roleTypeId ?? "",
    roleLabel: m.roleType?.label ?? m.role,
    pending: !m.user.emailVerified,
    joinedAt: m.createdAt.toISOString(),
  }))

  return (
    <AppShell>
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Members</h1>
        <p className="mt-1 text-muted-foreground">
          People who can access <span className="font-medium text-[#1a1a2e]">{ctx.committee.name}</span>.
          A member&rsquo;s role controls what they can see and do.
        </p>
      </div>

      <div className="mt-8">
        <MembersManager
          members={members}
          roles={assignableRoles}
          defaultRoleId={defaultRoleId}
          currentUserId={ctx.userId}
          canManageRoles={canManageRoles}
        />
      </div>

      {canManageRoles && (
        <div className="mt-12">
          <RolesManager roles={roleRows} />
        </div>
      )}
    </AppShell>
  )
}
