"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { legacyRoleForRoleKey } from "@/lib/permissions"

export type MemberResult = { ok: true } | { ok: false; error: string }

/** Active committee id if the caller may add/remove members, else null. */
async function requireMemberManager(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("members:manage")) return null
  return ctx.committee.id
}

/** A RoleType assignable in this committee: a global built-in or this committee's own custom role. */
async function resolveAssignableRole(roleTypeId: string, committeeId: string) {
  return prisma.roleType.findFirst({
    where: { id: roleTypeId, OR: [{ committeeId: null, isBuiltIn: true }, { committeeId }] },
    select: {
      id: true,
      key: true,
      // present iff the role can manage members (used for the lockout guard)
      permissions: { where: { permission: { key: "members:manage" } }, select: { permissionId: true } },
    },
  })
}

/** How many members of the committee hold a role that can manage members. */
async function countManagers(committeeId: string, excludeUserId?: string): Promise<number> {
  return prisma.committeeMembership.count({
    where: {
      committeeId,
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      roleType: { permissions: { some: { permission: { key: "members:manage" } } } },
    },
  })
}

/**
 * Invite someone to the active committee by email with a role. Members-managers may
 * invite. If no user with that email exists yet, a shell User row is created; they
 * gain access on their next sign-in.
 */
export async function inviteMember(email: string, roleTypeId: string): Promise<MemberResult> {
  const committeeId = await requireMemberManager()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage members." }

  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { ok: false, error: "Enter a valid email address." }

  const role = await resolveAssignableRole(roleTypeId, committeeId)
  if (!role) return { ok: false, error: "Pick a valid role." }

  const user = await prisma.user.upsert({
    where: { email: clean },
    create: { email: clean },
    update: {},
    select: { id: true },
  })

  const existing = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId: user.id, committeeId } },
    select: { userId: true },
  })
  if (existing) return { ok: false, error: "That person is already a member." }

  await prisma.committeeMembership.create({
    data: { userId: user.id, committeeId, role: legacyRoleForRoleKey(role.key), roleTypeId: role.id },
  })
  revalidatePath("/members")
  return { ok: true }
}

/** Assign a member a role. Requires the roles-manage privilege. */
export async function assignRole(userId: string, roleTypeId: string): Promise<MemberResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("roles:manage")) {
    return { ok: false, error: "You don't have permission to assign roles." }
  }
  const committeeId = ctx.committee.id

  const target = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
    select: { userId: true },
  })
  if (!target) return { ok: false, error: "Member not found." }

  const role = await resolveAssignableRole(roleTypeId, committeeId)
  if (!role) return { ok: false, error: "Pick a valid role." }

  // Never leave the committee with nobody who can manage members.
  const newRoleManages = role.permissions.length > 0
  if (!newRoleManages && (await countManagers(committeeId, userId)) < 1) {
    return { ok: false, error: "At least one member must keep a role that can manage members." }
  }

  await prisma.committeeMembership.update({
    where: { userId_committeeId: { userId, committeeId } },
    data: { role: legacyRoleForRoleKey(role.key), roleTypeId: role.id },
  })
  revalidatePath("/members")
  return { ok: true }
}

/** Remove a member. Members-managers may; never remove the last members-manager. */
export async function removeMember(userId: string): Promise<MemberResult> {
  const committeeId = await requireMemberManager()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage members." }

  const target = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
    select: { userId: true },
  })
  if (!target) return { ok: false, error: "Member not found." }

  if ((await countManagers(committeeId, userId)) < 1) {
    return { ok: false, error: "You can't remove the last member who can manage members." }
  }

  await prisma.committeeMembership.delete({
    where: { userId_committeeId: { userId, committeeId } },
  })
  revalidatePath("/members")
  return { ok: true }
}
