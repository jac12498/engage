"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast, type Role } from "@/lib/context"

export type MemberResult = { ok: true } | { ok: false; error: string }

const ASSIGNABLE_ROLES: Role[] = ["owner", "admin", "editor", "viewer"]

function isRole(v: string): v is Role {
  return (ASSIGNABLE_ROLES as string[]).includes(v)
}

/** Resolve the active committee + the caller's role, requiring at least `min`. */
async function requireManage(min: Role) {
  const ctx = await getActiveContext()
  if (!ctx) return null
  if (!roleAtLeast(ctx.role, min)) return null
  return { committeeId: ctx.committee.id, userId: ctx.userId, role: ctx.role }
}

/**
 * Invite someone to the active committee by email. Admins+ may invite. If no user
 * with that email exists yet, a shell User row is created; they gain access on their
 * next magic-link sign-in. Only owners may grant the owner role.
 */
export async function inviteMember(email: string, role: string): Promise<MemberResult> {
  const ctx = await requireManage("admin")
  if (!ctx) return { ok: false, error: "You don't have permission to manage members." }

  const clean = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { ok: false, error: "Enter a valid email address." }
  if (!isRole(role)) return { ok: false, error: "Invalid role." }
  if (role === "owner" && ctx.role !== "owner") {
    return { ok: false, error: "Only an owner can grant the owner role." }
  }

  // Find-or-create the user by email (a shell row is fine — NextAuth fills the
  // rest on first sign-in, keyed by the unique email).
  const user = await prisma.user.upsert({
    where: { email: clean },
    create: { email: clean },
    update: {},
    select: { id: true },
  })

  const existing = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId: user.id, committeeId: ctx.committeeId } },
    select: { userId: true },
  })
  if (existing) return { ok: false, error: "That person is already a member." }

  await prisma.committeeMembership.create({
    data: { userId: user.id, committeeId: ctx.committeeId, role },
  })

  revalidatePath("/members")
  return { ok: true }
}

/** Change a member's role. Admins+ may; only owners may set or change an owner. */
export async function changeMemberRole(userId: string, role: string): Promise<MemberResult> {
  const ctx = await requireManage("admin")
  if (!ctx) return { ok: false, error: "You don't have permission to manage members." }
  if (!isRole(role)) return { ok: false, error: "Invalid role." }

  const target = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId: ctx.committeeId } },
    select: { role: true },
  })
  if (!target) return { ok: false, error: "Member not found." }

  // Only owners may touch an owner membership or grant ownership.
  if ((target.role === "owner" || role === "owner") && ctx.role !== "owner") {
    return { ok: false, error: "Only an owner can change owner roles." }
  }

  // Don't allow removing the last owner (demotion of the sole owner).
  if (target.role === "owner" && role !== "owner") {
    const owners = await prisma.committeeMembership.count({
      where: { committeeId: ctx.committeeId, role: "owner" },
    })
    if (owners <= 1) return { ok: false, error: "A committee must have at least one owner." }
  }

  await prisma.committeeMembership.update({
    where: { userId_committeeId: { userId, committeeId: ctx.committeeId } },
    data: { role },
  })
  revalidatePath("/members")
  return { ok: true }
}

/** Remove a member. Admins+ may; only owners may remove an owner; never the last owner. */
export async function removeMember(userId: string): Promise<MemberResult> {
  const ctx = await requireManage("admin")
  if (!ctx) return { ok: false, error: "You don't have permission to manage members." }

  const target = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId: ctx.committeeId } },
    select: { role: true },
  })
  if (!target) return { ok: false, error: "Member not found." }

  if (target.role === "owner") {
    if (ctx.role !== "owner") return { ok: false, error: "Only an owner can remove an owner." }
    const owners = await prisma.committeeMembership.count({
      where: { committeeId: ctx.committeeId, role: "owner" },
    })
    if (owners <= 1) return { ok: false, error: "A committee must have at least one owner." }
  }

  await prisma.committeeMembership.delete({
    where: { userId_committeeId: { userId, committeeId: ctx.committeeId } },
  })
  revalidatePath("/members")
  return { ok: true }
}
