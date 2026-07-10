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
