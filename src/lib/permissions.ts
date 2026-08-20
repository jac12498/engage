/**
 * Privilege vocabulary for Engage RBAC — the single source of truth for both the
 * app (permission checks) and the SQL seed (which mirrors these lists).
 *
 * A privilege is per-module CRUD (`"contacts:update"`) plus a few admin/domain
 * privileges (`"members:manage"`). Keys are plain strings, so finer per-operation
 * privileges (e.g. `"newsletter:send"`) can be added later without reworking the
 * model. NOT server-only — the client sidebar imports these helpers to gate nav.
 */

/** Permission "module" vocabulary — matches the nav module keys (see lib/nav.ts). */
export const PERMISSION_MODULES = [
  "ai-communications",
  "candidate-websites",
  "newsletter",
  "contacts",
  "voters",
  "voter-outreach",
  "field-tools",
  "fundraising",
  "multi-candidate",
] as const
export type PermissionModule = (typeof PERMISSION_MODULES)[number]

export const CRUD = ["create", "read", "update", "delete"] as const
export type CrudAction = (typeof CRUD)[number]

/** Human labels for the module vocabulary — used by the role editor grid. */
export const MODULE_LABELS: Record<PermissionModule, string> = {
  "ai-communications": "Communications",
  "candidate-websites": "Candidate Website",
  newsletter: "Newsletter",
  contacts: "Contacts",
  voters: "Voter File",
  "voter-outreach": "Voter Outreach",
  "field-tools": "Field Tools",
  fundraising: "Fundraising",
  "multi-candidate": "Multi-Candidate",
}

/** Admin/domain privileges beyond per-module CRUD (only Committee Administrators hold these). */
export const ADMIN_PERMISSIONS = [
  "members:manage", // invite / remove committee members
  "roles:manage", // assign roles, create/edit committee custom roles
  "billing:manage", // plan + billing
  "campaigns:manage", // add/remove campaigns within the committee
] as const
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

export type ModulePermission = `${PermissionModule}:${CrudAction}`
export type PermissionKey = ModulePermission | AdminPermission

/** Build a module CRUD key. */
export function modulePerm(m: PermissionModule, a: CrudAction): ModulePermission {
  return `${m}:${a}`
}

/** Every module CRUD key. */
export const MODULE_PERMISSIONS: ModulePermission[] = PERMISSION_MODULES.flatMap((m) =>
  CRUD.map((a) => modulePerm(m, a)),
)

/** Every permission key (module CRUD + admin). */
export const ALL_PERMISSIONS: PermissionKey[] = [...MODULE_PERMISSIONS, ...ADMIN_PERMISSIONS]

// ─── Built-in roles ──────────────────────────────────────────────────────────
// Seeded as global RoleTypes (committeeId = null). Committee-scoped custom roles
// (module-based access) are created by admins in the UI (Phase B).

export type BuiltinRoleKey = "committee_admin" | "member" | "viewer"

export interface BuiltinRoleDef {
  key: BuiltinRoleKey
  label: string
  description: string
  permissions: PermissionKey[]
}

export const BUILTIN_ROLES: Record<BuiltinRoleKey, BuiltinRoleDef> = {
  committee_admin: {
    key: "committee_admin",
    label: "Committee Administrator",
    description: "Full control of the committee, its members, and every module.",
    permissions: ALL_PERMISSIONS,
  },
  member: {
    key: "member",
    label: "Member",
    description: "Create and edit across all modules; no member, billing, or role management.",
    permissions: MODULE_PERMISSIONS,
  },
  viewer: {
    key: "viewer",
    label: "Viewer",
    description: "Read-only access to all modules.",
    permissions: PERMISSION_MODULES.map((m) => modulePerm(m, "read")),
  },
}

/**
 * Legacy role → permission set. Used as a fallback while the RBAC seed hasn't run
 * yet (a membership still carries only the old `role` string). owner/admin behave
 * as Committee Administrators, editor as a Member, viewer as a Viewer.
 */
export function permissionsForLegacyRole(role: string | null | undefined): PermissionKey[] {
  switch (role) {
    case "owner":
    case "admin":
      return BUILTIN_ROLES.committee_admin.permissions
    case "editor":
      return BUILTIN_ROLES.member.permissions
    case "viewer":
      return BUILTIN_ROLES.viewer.permissions
    default:
      return BUILTIN_ROLES.member.permissions
  }
}

/** Is a string a valid module CRUD permission key (not an admin/domain perm)? */
export function isModulePermission(key: string): key is ModulePermission {
  return (MODULE_PERMISSIONS as string[]).includes(key)
}

/**
 * The legacy `role` string that best matches a RoleType key — kept in sync on the
 * membership so anything still reading `role` (requireCommittee min-checks, display)
 * stays sensible. committee_admin→admin, viewer→viewer, everything else→editor.
 */
export function legacyRoleForRoleKey(key: string): string {
  if (key === "committee_admin") return "admin"
  if (key === "viewer") return "viewer"
  return "editor"
}

// ─── Pure checks (usable on server or client) ────────────────────────────────

export function hasPermission(perms: ReadonlySet<string>, key: PermissionKey): boolean {
  return perms.has(key)
}

export function hasAnyPermission(perms: ReadonlySet<string>, keys: PermissionKey[]): boolean {
  return keys.some((k) => perms.has(k))
}

/** Can the holder see a module at all (read privilege on it)? */
export function canReadModule(perms: ReadonlySet<string>, moduleKey: string): boolean {
  return perms.has(`${moduleKey}:read`)
}
