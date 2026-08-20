import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    /** Whether the user belongs to at least one committee (gates onboarding). */
    hasCommittee: boolean
    /** The active committee the user is working in, or null pre-onboarding. */
    activeCommitteeId: string | null
    /** The active candidate (person) within that committee, or null if it has none. */
    activeCandidateId: string | null
    /** The active campaign (run) under the active candidate, or null if none. */
    activeCampaignId: string | null
    /** The user's role in the active committee: "owner" | "admin" | "editor" | "viewer". */
    role: string | null
    /** The active committee's plan: "starter" | "campaign" | "committee" | null. */
    plan: string | null
    /** Whether the user is an Overall System Administrator (global, cross-committee). */
    isSystemAdmin: boolean
    /** Active impersonation overlay (system admin only), or null. */
    impersonating: { userId: string; committeeId: string } | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    hasCommittee?: boolean
    activeCommitteeId?: string | null
    activeCandidateId?: string | null
    activeCampaignId?: string | null
    role?: string | null
    plan?: string | null
    isSystemAdmin?: boolean
    impersonating?: { userId: string; committeeId: string }
  }
}
