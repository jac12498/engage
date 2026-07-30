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
