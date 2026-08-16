/**
 * NextAuth (Auth.js v5) configuration for Engage.
 *
 * Email magic-link sign-in via Resend, Prisma adapter over the isolated
 * `engagecampaign` schema, JWT sessions. The session carries the account's
 * plan and whether onboarding (a Campaign) is complete, so page-level gates
 * can route Starter sign-ups straight into the workspace.
 */

import NextAuth, { type NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev"

for (const v of ["RESEND_API_KEY", "EMAIL_FROM", "AUTH_SECRET"] as const) {
  if (!process.env[v]) console.error(`[auth] Missing required env var: ${v}`)
}

/**
 * Resolve a user's active committee + campaign from the DB (their memberships and
 * persisted last-selection). This is the authoritative resolution the JWT caches;
 * `lib/context.ts` re-verifies membership + loads fresh rows for request handling.
 */
async function resolveActiveContext(userId: string): Promise<{
  hasCommittee: boolean
  activeCommitteeId: string | null
  activeCampaignId: string | null
  role: string | null
  plan: string | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastCommitteeId: true,
      lastCampaignId: true,
      memberships: {
        select: { committeeId: true, role: true, committee: { select: { plan: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  const memberships = user?.memberships ?? []
  if (memberships.length === 0) {
    return { hasCommittee: false, activeCommitteeId: null, activeCampaignId: null, role: null, plan: null }
  }

  // Active committee = the persisted last one (if still a member), else the first.
  const active =
    memberships.find((m) => m.committeeId === user?.lastCommitteeId) ?? memberships[0]
  const committeeId = active.committeeId

  // Active campaign = the persisted last one (if it belongs to this committee),
  // else the committee's first campaign, else null.
  let campaignId: string | null = null
  if (user?.lastCampaignId) {
    const belongs = await prisma.campaign.findFirst({
      where: { id: user.lastCampaignId, committeeId },
      select: { id: true },
    })
    campaignId = belongs?.id ?? null
  }
  if (!campaignId) {
    const first = await prisma.campaign.findFirst({
      where: { committeeId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    campaignId = first?.id ?? null
  }

  return {
    hasCommittee: true,
    activeCommitteeId: committeeId,
    activeCampaignId: campaignId,
    role: active.role,
    plan: active.committee.plan,
  }
}

export const authConfig = {
  adapter: PrismaAdapter(prisma),

  providers: [
    {
      id: "email",
      type: "email" as const,
      name: "Email",
      from: FROM,
      maxAge: 10 * 60, // magic link valid for 10 minutes

      async sendVerificationRequest({
        identifier: email,
        url,
      }: {
        identifier: string
        url: string
      }) {
        try {
          await resend.emails.send({
            from: FROM,
            to: email,
            subject: "Sign in to Engage",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 8px;">
                <div style="background: linear-gradient(135deg, #f0b429, #c4910a); width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0f2044; font-size: 20px;">E</div>
                <h2 style="color: #1a1a2e; margin-top: 20px;">Sign in to Engage</h2>
                <p style="color: #4a4a5e;">Click the button below to sign in. This link expires in 10 minutes.</p>
                <p style="margin: 28px 0;">
                  <a href="${url}" style="background-color: #1b3a6b; color: #ffffff; padding: 13px 26px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Sign in
                  </a>
                </p>
                <p style="color: #888; font-size: 13px;">
                  Or paste this link into your browser:<br/>
                  <a href="${url}" style="color: #1b3a6b; word-break: break-all;">${url}</a>
                </p>
                <p style="color: #aaa; font-size: 12px; margin-top: 28px;">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </div>
            `,
          })
        } catch (error) {
          console.error("[auth/Resend] Failed to send magic link:", error)
          throw error
        }
      },
    },
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
    verifyRequest: "/verify-request",
  },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, pin the user id.
      if (user) token.id = user.id

      // Resolve the active committee/campaign context onto the token: on sign-in,
      // on explicit update (after onboarding or a committee/campaign switch), and
      // whenever it's missing. The switcher persists User.lastCommitteeId /
      // lastCampaignId to the DB and then triggers an update, so we always resolve
      // from the DB — the single source of truth — rather than a client payload.
      if (token.id && (user || trigger === "update" || token.hasCommittee === undefined)) {
        const ctx = await resolveActiveContext(token.id as string)
        token.hasCommittee = ctx.hasCommittee
        token.activeCommitteeId = ctx.activeCommitteeId
        token.activeCampaignId = ctx.activeCampaignId
        token.role = ctx.role
        token.plan = ctx.plan
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.hasCommittee = !!token.hasCommittee
        session.activeCommitteeId = (token.activeCommitteeId as string | null) ?? null
        session.activeCampaignId = (token.activeCampaignId as string | null) ?? null
        session.role = (token.role as string | null) ?? null
        session.plan = (token.plan as string | null) ?? null
      }
      return session
    },

    async signIn({ account }) {
      // Only magic-link email sign-in is enabled.
      return account?.provider === "email"
    },
  },

  logger: {
    // A stale/invalid session cookie (e.g. signed with an old AUTH_SECRET) is an
    // expected, benign condition — Auth.js discards it and treats the request as
    // logged out. Don't surface it as a hard error (which Next renders as a crash
    // overlay in dev); only log it at debug level. Everything else logs normally.
    error(error: Error) {
      if (error.name === "JWTSessionError") {
        console.debug("[auth] discarded invalid session cookie:", error.message)
        return
      }
      console.error("[auth][error]", error)
    },
    warn(code: string) {
      console.warn("[auth][warn]", code)
    },
  },

  debug: false,
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } =
  NextAuth(authConfig)
