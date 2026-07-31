// Campaign-level newsletter template: shared header, footer, and theme reused across
// every issue. Stored on Campaign.newsletterTemplate (Json). PURE module.

export interface NewsletterTheme {
  primaryColor: string // headings + links
  accentColor: string // buttons
  fontFamily: "sans" | "serif"
  contentBg: string // page background behind the email card
}
export interface NewsletterHeaderConfig {
  showLogo: boolean
  logoText: string // empty → falls back to committee/candidate name at render
  showHeadshot: boolean
}
export interface NewsletterFooterConfig {
  signoff: string // optional sign-off line above the required legal footer
}
export interface NewsletterTemplate {
  theme: NewsletterTheme
  header: NewsletterHeaderConfig
  footer: NewsletterFooterConfig
}

export const DEFAULT_TEMPLATE: NewsletterTemplate = {
  theme: {
    primaryColor: "#1b3a6b",
    accentColor: "#c4910a",
    fontFamily: "sans",
    contentBg: "#f4f6f9",
  },
  header: { showLogo: true, logoText: "", showHeadshot: false },
  footer: { signoff: "" },
}

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
/** Validate a #rrggbb / #rgb hex color, else fall back. */
function hex(v: unknown, fallback: string): string {
  return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()) ? v.trim() : fallback
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

/** Fill defaults + sanitize a stored/incoming template (from Json). */
export function parseTemplate(raw: unknown): NewsletterTemplate {
  const r = record(raw)
  const t = record(r.theme)
  const h = record(r.header)
  const f = record(r.footer)
  const d = DEFAULT_TEMPLATE
  return {
    theme: {
      primaryColor: hex(t.primaryColor, d.theme.primaryColor),
      accentColor: hex(t.accentColor, d.theme.accentColor),
      fontFamily: t.fontFamily === "serif" ? "serif" : "sans",
      contentBg: hex(t.contentBg, d.theme.contentBg),
    },
    header: {
      showLogo: h.showLogo === undefined ? d.header.showLogo : !!h.showLogo,
      logoText: str(h.logoText, 120),
      showHeadshot: !!h.showHeadshot,
    },
    footer: { signoff: str(f.signoff, 300) },
  }
}

export const FONT_STACKS: Record<NewsletterTheme["fontFamily"], string> = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
}
