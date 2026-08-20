"use server"

import { signOut } from "@/lib/auth"
import { generateCode, storeCode } from "@/lib/otpStore"
import { sendLoginCodeEmail } from "@/lib/email"

/** Sign the user out and return them to the sign-in page. Usable as a form action
 *  from client components (e.g. the sidebar). */
export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" })
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/**
 * Generate a 6-digit sign-in code for `email`, store it (10-min TTL, 5-attempt
 * cap), and email it. Verification happens in the NextAuth "otp" credentials
 * provider, so the code signs the user in inside the same tab — no magic-link
 * new tab. A code is sent to any valid address; the account is created on first
 * valid code, matching the prior magic-link auto-create behavior.
 */
export async function sendLoginCode(
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = String(emailRaw || "").trim().toLowerCase()
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Enter a valid email address." }
  }
  try {
    const code = generateCode()
    storeCode(email, code)
    await sendLoginCodeEmail({ to: email, code })
    return { ok: true }
  } catch (err) {
    console.error("[sendLoginCode]", err)
    return { ok: false, error: "Couldn't send your code. Please try again." }
  }
}
