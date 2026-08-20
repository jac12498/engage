import "server-only"
import { Resend } from "resend"

// Shared Resend client for transactional email (magic links use their own instance
// in auth.ts; this powers newsletter confirmations and, later, sends). Bulk campaign
// sending (Phase 3) will layer sending-domain config on top of this.
export const resend = new Resend(process.env.RESEND_API_KEY)
export const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev"

export async function sendMail(opts: { to: string; subject: string; html: string; from?: string }) {
  return resend.emails.send({
    from: opts.from || EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
}

/** Email a 6-digit sign-in code (the passwordless code flow, in place of a magic link). */
export async function sendLoginCodeEmail(opts: { to: string; code: string }) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 8px;">
      <div style="background: linear-gradient(135deg, #f0b429, #c4910a); width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #0f2044; font-size: 20px;">E</div>
      <h2 style="color: #1a1a2e; margin-top: 20px;">Your Engage sign-in code</h2>
      <p style="color: #4a4a5e;">Enter this code to sign in. It expires in 10 minutes.</p>
      <div style="margin: 24px 0; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #1b3a6b; font-family: 'SFMono-Regular', Consolas, monospace;">${opts.code}</div>
      <p style="color: #aaa; font-size: 12px; margin-top: 28px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `
  return sendMail({ to: opts.to, subject: "Your Engage sign-in code", html })
}
