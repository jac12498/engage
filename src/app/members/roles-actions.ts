"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { isModulePermission } from "@/lib/permissions"

export type RoleResult = { ok: true; id?: string } | { ok: false; error: string }

/** Active committee id if the caller may manage roles, else null. */
async function requireRoleManager(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("roles:manage")) return null
  return ctx.committee.id
}

function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "role"
  )
}

/** A committee-unique role key derived from the name (custom roles only). */
async function uniqueRoleKey(committeeId: string, base: string, excludeId?: string): Promise<string> {
  const root = slugify(base)
  let key = root
  let n = 1
  for (;;) {
    const existing = await prisma.roleType.findFirst({
      where: { committeeId, key },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return key
    n += 1
    key = `${root}-${n}`
  }
}

/**
 * Keep only valid MODULE CRUD permission keys. Custom (committee) roles may grant
 * module privileges only — never the admin/domain perms (members/roles/billing/
 * campaigns manage), which belong to Committee Administrator alone.
 */
function cleanPermissionKeys(keys: string[]): string[] {
  const set = new Set<string>()
  for (const k of keys) if (isModulePermission(k)) set.add(k)
  return [...set]
}

export async function createRole(input: {
  name: string
  description?: string
  permissions: string[]
}): Promise<RoleResult> {
  const committeeId = await requireRoleManager()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage roles." }

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Enter a role name." }
  const permKeys = cleanPermissionKeys(input.permissions)
  if (permKeys.length === 0) return { ok: false, error: "Select at least one privilege." }

  const key = await uniqueRoleKey(committeeId, name)
  const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } }, select: { id: true } })

  const role = await prisma.roleType.create({
    data: {
      key,
      label: name,
      description: input.description?.trim() || null,
      isBuiltIn: false,
      committeeId,
      permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
    },
    select: { id: true },
  })
  revalidatePath("/members")
  return { ok: true, id: role.id }
}

export async function updateRole(input: {
  id: string
  name: string
  description?: string
  permissions: string[]
}): Promise<RoleResult> {
  const committeeId = await requireRoleManager()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage roles." }

  const name = input.name.trim()
  if (!name) return { ok: false, error: "Enter a role name." }
  const permKeys = cleanPermissionKeys(input.permissions)
  if (permKeys.length === 0) return { ok: false, error: "Select at least one privilege." }

  // Only this committee's own custom roles are editable (never a built-in).
  const role = await prisma.roleType.findFirst({
    where: { id: input.id, committeeId, isBuiltIn: false },
    select: { id: true },
  })
  if (!role) return { ok: false, error: "Role not found." }

  const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } }, select: { id: true } })
  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleTypeId: role.id } }),
    prisma.roleType.update({
      where: { id: role.id },
      data: {
        label: name,
        description: input.description?.trim() || null,
        permissions: { create: perms.map((p) => ({ permissionId: p.id })) },
      },
    }),
  ])
  revalidatePath("/members")
  return { ok: true, id: role.id }
}

export async function deleteRole(id: string): Promise<RoleResult> {
  const committeeId = await requireRoleManager()
  if (!committeeId) return { ok: false, error: "You don't have permission to manage roles." }

  const role = await prisma.roleType.findFirst({
    where: { id, committeeId, isBuiltIn: false },
    select: { id: true, _count: { select: { memberships: true } } },
  })
  if (!role) return { ok: false, error: "Role not found." }
  if (role._count.memberships > 0) {
    return {
      ok: false,
      error: `That role is assigned to ${role._count.memberships} member${
        role._count.memberships === 1 ? "" : "s"
      }. Reassign them first.`,
    }
  }
  await prisma.roleType.delete({ where: { id: role.id } })
  revalidatePath("/members")
  return { ok: true }
}
