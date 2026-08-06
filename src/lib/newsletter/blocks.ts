// Newsletter block registry — the single source of truth for the per-issue content
// block vocabulary: types, prop shapes, defaults, and per-type validation. PURE (no
// React, no server imports) so the editor, server actions, and email renderer all
// share it. Mirrors src/lib/website/blocks.ts. The email render lives separately in
// src/lib/newsletter/renderEmail.ts.
//
// `validate` runs on every write — unknown keys dropped, unknown types rejected,
// strings clamped, hrefs sanitized.

export interface HeadingProps {
  text: string
}
export interface TextProps {
  body: string // plain text; blank lines separate paragraphs
}
export interface ImageProps {
  src: string
  alt?: string
  href?: string
}
export interface ImageTextProps {
  src: string
  alt?: string
  href?: string
  body: string // plain text; blank lines separate paragraphs
  side: "left" | "right" // which side the image sits on; text wraps the other side
}
export interface ButtonProps {
  label: string
  href: string
  align?: "left" | "center" | "right"
}
export type DividerProps = Record<string, never>
export interface SpacerProps {
  size: "small" | "medium" | "large"
}
export interface TwoColumnProps {
  left: string
  right: string
}
export interface SocialProps {
  facebook: string
  x: string
  instagram: string
  youtube: string
  website: string
}
export interface QuoteProps {
  text: string
  attribution: string
}

// ─── Sanitizers ──────────────────────────────────────────────────────────────

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}
function optStr(v: unknown, max: number): string | undefined {
  const t = typeof v === "string" ? v.trim().slice(0, max) : ""
  return t || undefined
}
/** Allow internal absolute paths and http(s) URLs; block javascript:/data:/etc. */
export function safeHref(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  if (!t) return undefined
  if (t.startsWith("/") && !t.startsWith("//")) return t.slice(0, 500)
  try {
    const u = new URL(t)
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString().slice(0, 2000) : undefined
  } catch {
    return undefined
  }
}

// ─── Inline links ────────────────────────────────────────────────────────────
// Markdown-style [label](url) inside text bodies. Parsed here (once) so the email
// and web renderers produce identical, safe output.

/** One run of a text body: plain text, or a resolved inline link. */
export type InlineToken = { text: string } | { label: string; href: string }

const INLINE_LINK_RE = /\[([^\]\n]+)\]\(([^)\s]+)\)/g

/** Prepend https:// to a bare domain (example.com, www.foo.org/x) so authors needn't. */
function normalizeInlineUrl(raw: string): string {
  const t = raw.trim()
  if (/^(https?:\/\/|\/)/i.test(t)) return t
  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(t)) return "https://" + t
  return t
}

/**
 * Split a plain-text run into text/link tokens on [label](url). URLs are sanitized
 * with safeHref (http(s) or internal paths only; bare domains get https://). An
 * unsafe or malformed URL keeps the literal "[label](url)" so the author can see
 * and fix it rather than have it silently vanish.
 */
export function parseInlineLinks(input: string): InlineToken[] {
  const out: InlineToken[] = []
  let last = 0
  INLINE_LINK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INLINE_LINK_RE.exec(input)) !== null) {
    if (m.index > last) out.push({ text: input.slice(last, m.index) })
    const href = safeHref(normalizeInlineUrl(m[2]))
    if (href) out.push({ label: m[1], href })
    else out.push({ text: m[0] })
    last = m.index + m[0].length
  }
  if (last < input.length) out.push({ text: input.slice(last) })
  return out
}

// ─── Registry ────────────────────────────────────────────────────────────────

export interface NlBlockSpec<P> {
  type: string
  label: string
  description: string
  defaultProps: () => P
  validate: (raw: unknown) => P
}

export const NL_BLOCK_SPECS = {
  heading: {
    type: "heading",
    label: "Heading",
    description: "A section heading.",
    defaultProps: (): HeadingProps => ({ text: "" }),
    validate: (raw: unknown): HeadingProps => ({ text: str(record(raw).text, 200) }),
  } satisfies NlBlockSpec<HeadingProps>,

  text: {
    type: "text",
    label: "Text",
    description: "A paragraph of text. Blank lines separate paragraphs.",
    defaultProps: (): TextProps => ({ body: "" }),
    validate: (raw: unknown): TextProps => ({ body: str(record(raw).body, 20000) }),
  } satisfies NlBlockSpec<TextProps>,

  image: {
    type: "image",
    label: "Image",
    description: "An image by URL, with optional alt text and link.",
    defaultProps: (): ImageProps => ({ src: "" }),
    validate: (raw: unknown): ImageProps => {
      const r = record(raw)
      const props: ImageProps = { src: safeHref(r.src) ?? "" }
      const alt = optStr(r.alt, 300)
      if (alt) props.alt = alt
      const href = safeHref(r.href)
      if (href) props.href = href
      return props
    },
  } satisfies NlBlockSpec<ImageProps>,

  imageText: {
    type: "imageText",
    label: "Image + text",
    description: "An image with text wrapping around it, on the left or right.",
    defaultProps: (): ImageTextProps => ({ src: "", body: "", side: "left" }),
    validate: (raw: unknown): ImageTextProps => {
      const r = record(raw)
      const props: ImageTextProps = {
        src: safeHref(r.src) ?? "",
        body: str(r.body, 20000),
        side: r.side === "right" ? "right" : "left",
      }
      const alt = optStr(r.alt, 300)
      if (alt) props.alt = alt
      const href = safeHref(r.href)
      if (href) props.href = href
      return props
    },
  } satisfies NlBlockSpec<ImageTextProps>,

  button: {
    type: "button",
    label: "Button",
    description: "A call-to-action button — e.g. Donate, RSVP, Read more.",
    defaultProps: (): ButtonProps => ({ label: "Donate", href: "", align: "center" }),
    validate: (raw: unknown): ButtonProps => {
      const r = record(raw)
      const align = r.align === "left" || r.align === "right" ? r.align : "center"
      return {
        label: str(r.label, 80) || "Learn more",
        href: safeHref(r.href) ?? "#",
        align,
      }
    },
  } satisfies NlBlockSpec<ButtonProps>,

  divider: {
    type: "divider",
    label: "Divider",
    description: "A horizontal divider between sections.",
    defaultProps: (): DividerProps => ({}),
    validate: (): DividerProps => ({}),
  } satisfies NlBlockSpec<DividerProps>,

  spacer: {
    type: "spacer",
    label: "Spacer",
    description: "An adjustable vertical gap between sections.",
    defaultProps: (): SpacerProps => ({ size: "medium" }),
    validate: (raw: unknown): SpacerProps => {
      const s = record(raw).size
      return { size: s === "small" || s === "large" ? s : "medium" }
    },
  } satisfies NlBlockSpec<SpacerProps>,

  twoColumn: {
    type: "twoColumn",
    label: "Two columns",
    description: "Two side-by-side text columns (stacks on narrow screens).",
    defaultProps: (): TwoColumnProps => ({ left: "", right: "" }),
    validate: (raw: unknown): TwoColumnProps => {
      const r = record(raw)
      return { left: str(r.left, 8000), right: str(r.right, 8000) }
    },
  } satisfies NlBlockSpec<TwoColumnProps>,

  social: {
    type: "social",
    label: "Social links",
    description: "A centered row of links to your social profiles.",
    defaultProps: (): SocialProps => ({ facebook: "", x: "", instagram: "", youtube: "", website: "" }),
    validate: (raw: unknown): SocialProps => {
      const r = record(raw)
      return {
        facebook: safeHref(r.facebook) ?? "",
        x: safeHref(r.x) ?? "",
        instagram: safeHref(r.instagram) ?? "",
        youtube: safeHref(r.youtube) ?? "",
        website: safeHref(r.website) ?? "",
      }
    },
  } satisfies NlBlockSpec<SocialProps>,

  quote: {
    type: "quote",
    label: "Quote / callout",
    description: "A highlighted pull-quote or callout with an accent border.",
    defaultProps: (): QuoteProps => ({ text: "", attribution: "" }),
    validate: (raw: unknown): QuoteProps => {
      const r = record(raw)
      return { text: str(r.text, 2000), attribution: str(r.attribution, 200) }
    },
  } satisfies NlBlockSpec<QuoteProps>,
} as const

export type NlBlockType = keyof typeof NL_BLOCK_SPECS

export const NL_BLOCK_ORDER: NlBlockType[] = [
  "heading",
  "text",
  "image",
  "imageText",
  "button",
  "quote",
  "twoColumn",
  "social",
  "divider",
  "spacer",
]

export function isNlBlockType(v: unknown): v is NlBlockType {
  return typeof v === "string" && v in NL_BLOCK_SPECS
}

/** One content block instance as stored in Newsletter.blocks. */
export interface NlBlock {
  id: string
  type: NlBlockType
  props: unknown
  /** Optional grouping tag. Contiguous blocks sharing a groupId form an editor
   *  "group" (e.g. an Article) that moves/collapses as a unit. Renderers ignore it. */
  groupId?: string
}

/** Validate a (type, props) pair for a write. Returns type + sanitized props, or null. */
export function validateNlBlock(type: unknown, rawProps: unknown): { type: NlBlockType; props: unknown } | null {
  if (!isNlBlockType(type)) return null
  return { type, props: NL_BLOCK_SPECS[type].validate(rawProps) }
}

/** Parse + sanitize a stored/incoming blocks array (from Json). Drops invalid entries. */
export function parseBlocks(raw: unknown): NlBlock[] {
  if (!Array.isArray(raw)) return []
  const out: NlBlock[] = []
  for (const item of raw) {
    const r = record(item)
    const v = validateNlBlock(r.type, r.props)
    if (!v) continue
    const id = typeof r.id === "string" && r.id ? r.id.slice(0, 64) : cryptoRandomId()
    const block: NlBlock = { id, type: v.type, props: v.props }
    if (typeof r.groupId === "string" && r.groupId) block.groupId = r.groupId.slice(0, 64)
    out.push(block)
    if (out.length >= 100) break
  }
  return out
}

function cryptoRandomId(): string {
  // Short unique-enough id for a block; no crypto import needed at module scope.
  return "b" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
