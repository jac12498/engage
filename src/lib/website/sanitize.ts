// Site-level input sanitizers, shared by the website server actions. These fields
// render into the public page, so every value is validated here before it is stored.

const FONT_THEMES = ["classic", "modern", "serif"] as const

export function safeColor(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v.trim()) ? v.trim() : fallback
}

export function safeFont(v: unknown): string {
  return typeof v === "string" && (FONT_THEMES as readonly string[]).includes(v) ? v : "classic"
}

/** Only allow http(s) URLs — blocks javascript:/data: on public href/src. */
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null
  try {
    const u = new URL(v.trim())
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

export function safeStr(v: unknown, max = 8000): string | null {
  if (typeof v !== "string") return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export function safeEmail(v: unknown): string | null {
  const email = safeStr(v, 200)
  return email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null
}
