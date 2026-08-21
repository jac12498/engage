/**
 * Canonicalize an email for "same person?" comparisons. Two addresses that deliver to
 * the same inbox should canonicalize equal — notably Gmail ignores dots and anything
 * after a "+" in the local part (googlemail.com is an alias of gmail.com). For other
 * providers we only strip a "+tag" suffix, the near-universal alias convention.
 *
 * This is for DEDUP/warning only — the address the user actually typed is still what
 * gets stored/emailed; we never rewrite someone's email to the canonical form.
 */
export function canonicalizeEmail(email: string): string {
  const e = (email ?? "").trim().toLowerCase()
  const at = e.lastIndexOf("@")
  if (at < 1) return e
  let local = e.slice(0, at)
  let domain = e.slice(at + 1)

  local = local.split("+")[0]
  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "")
    domain = "gmail.com"
  }
  return `${local}@${domain}`
}
