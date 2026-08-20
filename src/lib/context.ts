import "server-only"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Committee, Candidate, Campaign } from "@/generated/prisma/client"
import { permissionsForLegacyRole, type PermissionKey } from "@/lib/permissions"

/**
 * A merged view of a candidate (the person) + one of their campaigns (a run) — the
 * shape the render/prompt/newsletter code consumes, so those functions keep reading a
 * single object with both person fields (candidateName, bio, headshot) and run fields
 * (office, party, district). `id` is the CANDIDATE id (headshot + public-site routes
 * key on it); use the Campaign row's own id for per-campaign relation queries.
 */
export type CampaignProfile = Candidate & Campaign

export function campaignProfile(candidate: Candidate, campaign: Campaign): CampaignProfile {
  return { ...campaign, ...candidate }
}

/**
 * Active-context resolver — the single place the app answers "which committee and
 * campaign is this signed-in user working in, and what may they do?".
 *
 * A user belongs to one or more committees (CommitteeMembership) with a role. The
 * session carries the *selected* active committee + campaign; this module verifies
 * that membership on every access (the authorization boundary) and loads fresh rows
 * (committee metering counters must not be read from a possibly-stale token).
 *
 * Use `requireCommittee()` for committee-wide work (CRM, members, billing) and
 * `requireActiveCampaign()` for candidate-specific work (communications, website,
 * newsletter). `getActiveContext()` is the nullable, non-redirecting primitive.
 */

export type Role = "owner" | "admin" | "editor" | "viewer"

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2, owner: 3 }

/** True when `role` is at least as privileged as `min`. */
export function roleAtLeast(role: string | null | undefined, min: Role): boolean {
  const r = role ? RANK[role as Role] : undefined
  return r !== undefined && r >= RANK[min]
}

export interface ActiveContext {
  userId: string
  committee: Committee
  role: Role
  /** The assigned RoleType key (e.g. "committee_admin", "member", or a custom key), or null pre-seed. */
  roleTypeKey: string | null
  /** Resolved privilege keys for this member in this committee (e.g. "contacts:update"). */
  permissions: Set<string>
  /** Whether the signed-in user is an Overall System Administrator (global). */
  isSystemAdmin: boolean
  /** When a system admin is impersonating a member, who + where; else null. */
  impersonating: { userId: string; committeeId: string } | null
  /** The active candidate (the person) in the committee, or null if it has none yet. */
  candidate: Candidate | null
  /** The active campaign (a run) under the active candidate, or null if none. */
  campaign: Campaign | null
}

/** Does the context hold a given privilege? */
export function can(ctx: { permissions: ReadonlySet<string> }, key: PermissionKey): boolean {
  return ctx.permissions.has(key)
}

/** Does the context hold at least one of the given privileges? */
export function canAny(ctx: { permissions: ReadonlySet<string> }, keys: PermissionKey[]): boolean {
  return keys.some((k) => ctx.permissions.has(k))
}

/**
 * Resolve the active context from the session, verifying membership. Returns null
 * when signed out, when no committee is selected, or when the selected committee is
 * no longer one the user belongs to.
 */
/**
 * Load a user's membership in a committee and build the core context (committee,
 * role, resolved privileges, active campaign). Shared by the normal path and the
 * system-admin impersonation path. Returns null if the user isn't a member.
 */
async function buildMembershipContext(
  userId: string,
  committeeId: string,
  preferredCandidateId?: string | null,
  preferredCampaignId?: string | null,
): Promise<Omit<ActiveContext, "isSystemAdmin" | "impersonating"> | null> {
  const membership = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
    include: {
      committee: true,
      roleType: { include: { permissions: { include: { permission: true } } } },
    },
  })
  if (!membership) return null

  // Resolve privileges from the assigned RoleType; fall back to the legacy `role`
  // string until the RBAC seed has run and backfilled roleTypeId.
  const permissions = new Set<string>(
    membership.roleType
      ? membership.roleType.permissions.map((rp) => rp.permission.key)
      : permissionsForLegacyRole(membership.role),
  )

  // Active candidate: prefer the requested one (verified in-committee), else the
  // committee's first candidate.
  let candidate =
    (preferredCandidateId
      ? await prisma.candidate.findFirst({ where: { id: preferredCandidateId, committeeId } })
      : null) ?? null
  if (!candidate) {
    candidate = await prisma.candidate.findFirst({ where: { committeeId }, orderBy: { createdAt: "asc" } })
  }

  // Active campaign (a run under that candidate): prefer the requested one, else the
  // candidate's latest by cycle.
  let campaign: Campaign | null = null
  if (candidate) {
    campaign =
      (preferredCampaignId
        ? await prisma.campaign.findFirst({ where: { id: preferredCampaignId, candidateId: candidate.id } })
        : null) ?? null
    if (!campaign) {
      campaign = await prisma.campaign.findFirst({
        where: { candidateId: candidate.id },
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
      })
    }
  }

  return {
    userId,
    committee: membership.committee,
    role: membership.role as Role,
    roleTypeKey: membership.roleType?.key ?? null,
    permissions,
    candidate,
    campaign,
  }
}

export async function getActiveContext(): Promise<ActiveContext | null> {
  const session = await auth()
  const realUserId = session?.user?.id
  if (!realUserId) return null

  const isSystemAdmin = Boolean(session.isSystemAdmin)
  const imp = session.impersonating

  // Impersonation overlay: honored ONLY for a real system admin, and re-verified
  // here every request (never trusted from client input). Resolves the TARGET
  // member's committee/role/privileges so the admin sees exactly what they see.
  if (imp && isSystemAdmin) {
    const core = await buildMembershipContext(imp.userId, imp.committeeId)
    if (core) return { ...core, isSystemAdmin, impersonating: { userId: imp.userId, committeeId: imp.committeeId } }
    // Target membership no longer exists → fall through to the admin's own context.
  }

  const committeeId = session.activeCommitteeId
  if (!committeeId) return null
  const core = await buildMembershipContext(
    realUserId,
    committeeId,
    session.activeCandidateId,
    session.activeCampaignId,
  )
  if (!core) return null
  return { ...core, isSystemAdmin, impersonating: null }
}

/**
 * Require an active committee the user belongs to (optionally at a minimum role).
 * Redirects to onboarding when there's no committee, or to the dashboard when the
 * user's role is insufficient.
 */
export async function requireCommittee(min: Role = "viewer"): Promise<ActiveContext> {
  const ctx = await getActiveContext()
  if (!ctx) redirect("/onboarding")
  if (!roleAtLeast(ctx.role, min)) redirect("/dashboard")
  return ctx
}

/**
 * Require an active committee AND a campaign within it (for candidate-specific
 * modules). When the committee has no campaign yet, send the user to add one —
 * NOT to onboarding (they're already set up as a committee).
 */
export async function requireActiveCampaign(
  min: Role = "viewer"
): Promise<ActiveContext & { candidate: Candidate; campaign: Campaign }> {
  const ctx = await requireCommittee(min)
  if (!ctx.candidate) redirect("/candidates/new")
  if (!ctx.campaign) redirect("/campaigns/new")
  return ctx as ActiveContext & { candidate: Candidate; campaign: Campaign }
}

/**
 * Require an active committee AND a specific privilege — for page-level gating.
 * Redirects to the dashboard when the member's role lacks the privilege. Server
 * actions should instead use `getActiveContext` + `can()` and return an error.
 */
export async function requirePrivilege(key: PermissionKey): Promise<ActiveContext> {
  const ctx = await requireCommittee()
  if (!ctx.permissions.has(key)) redirect("/dashboard")
  return ctx
}

/**
 * Require an Overall System Administrator (global flag). For the /admin area and
 * impersonation controls. Reads the real user's flag from the session — impersonation
 * never changes it. Redirects out otherwise.
 */
export async function requireSystemAdmin(): Promise<{ userId: string }> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) redirect("/sign-in")
  if (!session.isSystemAdmin) redirect("/dashboard")
  return { userId }
}
