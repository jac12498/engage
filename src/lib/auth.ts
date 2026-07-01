/**
 * NextAuth (Auth.js v5) configuration for Engage Campaign.
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
            subject: "Sign in to Engage Campaign",
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 8px;">
                <div style="background: linear-gradient(135deg, #f0b429, #c4910a); width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0f2044; font-size: 20px;">E</div>
                <h2 style="color: #1a1a2e; margin-top: 20px;">Sign in to Engage Campaign</h2>
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
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, pin the user id.
      if (user) token.id = user.id

      // Refresh campaign/plan onto the token: on sign-in, on explicit update
      // (after onboarding), and whenever it's missing.
      if (token.id && (user || trigger === "update" || token.plan === undefined)) {
        const campaign = await prisma.campaign.findUnique({
          where: { userId: token.id as string },
          select: { plan: true },
        })
        token.hasCampaign = !!campaign
        token.plan = campaign?.plan ?? null
      }

      // Allow the client to optimistically patch the token after onboarding.
      if (trigger === "update" && session) {
        if (session.plan !== undefined) token.plan = session.plan
        if (session.hasCampaign !== undefined) token.hasCampaign = session.hasCampaign
      }

      return token
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.plan = (token.plan as string | null) ?? null
        session.hasCampaign = !!token.hasCampaign
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

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
