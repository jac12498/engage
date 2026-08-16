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
    /** The active campaign within that committee, or null if it has none yet. */
    activeCampaignId: string | null
    /** The user's role in the active committee: "owner" | "admin" | "editor" | "viewer". */
    role: string | null
    /** The active committee's plan: "starter" | "campaign" | "committee" | null. */
    plan: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    hasCommittee?: boolean
    activeCommitteeId?: string | null
    activeCampaignId?: string | null
    role?: string | null
    plan?: string | null
  }
}
