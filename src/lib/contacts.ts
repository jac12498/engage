// Shared contact constants — importable from both server actions and client
// components. (A "use server" module can only export async functions, so these
// live here instead of in app/contacts/actions.ts.)

/** Contact classifications offered in the UI. */
export const CONTACT_TYPES = [
  "supporter",
  "volunteer",
  "donor",
  "voter",
  "prospect",
  "other",
] as const
export type ContactType = (typeof CONTACT_TYPES)[number]

export function isContactType(v: string): v is ContactType {
  return (CONTACT_TYPES as readonly string[]).includes(v)
}

/**
 * Display a US phone number as xxx-xxx-xxxx. Accepts any input; a 10-digit
 * number (or 11 digits with a leading country code "1") is reformatted, and
 * anything else is returned unchanged so international/partial numbers survive.
 */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits
  if (local.length !== 10) return raw
  return `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`
}
