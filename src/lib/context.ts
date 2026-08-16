import "server-only"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Committee, Campaign } from "@/generated/prisma/client"

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
  /** The active campaign within the committee, or null if it has none yet. */
  campaign: Campaign | null
}

/**
 * Resolve the active context from the session, verifying membership. Returns null
 * when signed out, when no committee is selected, or when the selected committee is
 * no longer one the user belongs to.
 */
export async function getActiveContext(): Promise<ActiveContext | null> {
  const session = await auth()
  const userId = session?.user?.id
  const committeeId = session?.activeCommitteeId
  if (!userId || !committeeId) return null

  const membership = await prisma.committeeMembership.findUnique({
    where: { userId_committeeId: { userId, committeeId } },
    include: { committee: true },
  })
  if (!membership) return null

  // Active campaign: prefer the session's selection (verified in-committee), else
  // fall back to the committee's first campaign.
  const selectedId = session.activeCampaignId
  let campaign =
    (selectedId
      ? await prisma.campaign.findFirst({ where: { id: selectedId, committeeId } })
      : null) ?? null
  if (!campaign) {
    campaign = await prisma.campaign.findFirst({
      where: { committeeId },
      orderBy: { createdAt: "asc" },
    })
  }

  return {
    userId,
    committee: membership.committee,
    role: membership.role as Role,
    campaign,
  }
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
 * modules). Redirects to onboarding when the committee has no campaign yet.
 */
export async function requireActiveCampaign(
  min: Role = "viewer"
): Promise<ActiveContext & { campaign: Campaign }> {
  const ctx = await requireCommittee(min)
  if (!ctx.campaign) redirect("/onboarding")
  return ctx as ActiveContext & { campaign: Campaign }
}
