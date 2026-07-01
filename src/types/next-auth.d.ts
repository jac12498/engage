import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    /** Account plan: "starter" | "campaign" | "committee" | null (pre-onboarding). */
    plan: string | null
    /** Whether the user has completed onboarding (created a Campaign). */
    hasCampaign: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    plan?: string | null
    hasCampaign?: boolean
  }
}
