// Website block registry (Phase 1, Step 1B) — the SINGLE SOURCE OF TRUTH for the
// v1 block vocabulary: types, prop shapes, default props, and per-type validation.
//
// This module is deliberately PURE (no React, no server-only imports) so it is safe
// to import from anywhere: the server actions that write blocks (Step 1C), the future
// client editor palette, and the Phase 2 AI tool schema all read from here. The actual
// render components live separately under `src/app/websites/[campaignId]/_render/`
// (some are async server components that query the DB — keeping them out of this file
// is what lets the client editor import the registry).
//
// Security note: `validate` runs on EVERY write (create, manual edit, AI edit). It is
// the boundary that lets candidate/AI-authored input safely drive a public page —
// unknown keys are dropped, unknown block types are rejected, and every href/string is
// sanitized + length-clamped here.

// ─── Prop shapes ─────────────────────────────────────────────────────────────

export interface CtaLink {
  label: string
  href: string
}

export interface HeroProps {
  headline: string
  subhead?: string
  showHeadshot?: boolean
  imageUrl?: string
  primaryCta?: CtaLink
  secondaryCta?: CtaLink
}
export interface ImageProps {
  url: string
  alt?: string
  caption?: string
}
export interface RichTextProps {
  heading?: string
  body: string
  cta?: CtaLink
}
export interface IssuesGridProps {
  heading?: string
  intro?: string
  items: { title: string; body: string }[]
}
export interface CandidatesProps {
  heading?: string
  intro?: string
}
export interface VolunteerFormProps {
  heading?: string
  intro?: string
}
export interface NewsletterSignupProps {
  heading?: string
  intro?: string
  buttonLabel?: string
}
export interface CtaBandProps {
  heading?: string
  text?: string
  buttonLabel: string
  href: string
}
export interface EndorsementsProps {
  heading?: string
  intro?: string
  items: { name: string; role?: string; quote?: string }[]
}
export interface NewsFeedProps {
  heading?: string
  intro?: string
  types: string[]
  limit: number
}
export interface PressMentionsProps {
  heading?: string
  intro?: string
  limit: number
}
export interface NewsletterArchiveProps {
  heading?: string
  intro?: string
  limit: number
}
export interface EventsProps {
  heading?: string
  intro?: string
  items: { title: string; date?: string; location?: string; description?: string }[]
}
export interface FaqProps {
  heading?: string
  intro?: string
  items: { q: string; a: string }[]
}

// ─── Sanitizers (shared) ─────────────────────────────────────────────────────

function record(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
/** Required string → trimmed, clamped, "" if absent. */
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}
/** Optional string → trimmed+clamped, or undefined when empty/absent. */
function optStr(v: unknown, max: number): string | undefined {
  const t = typeof v === "string" ? v.trim().slice(0, max) : ""
  return t || undefined
}
/**
 * Sanitize an href for a public page. Allows same-page anchors (`#volunteer`),
 * internal absolute paths (`/websites/…`), and http(s) URLs. Blocks `javascript:`,
 * `data:`, and anything else. Returns undefined when unusable.
 */
export function safeHref(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined
  const t = v.trim()
  if (!t) return undefined
  if (t.startsWith("#")) return t.slice(0, 200)
  if (t.startsWith("/") && !t.startsWith("//")) return t.slice(0, 500)
  try {
    const u = new URL(t)
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString().slice(0, 2000) : undefined
  } catch {
    return undefined
  }
}
/** An image src: http(s) or an internal path (our /api/website/image route); never `#`. */
export function safeImageUrl(v: unknown): string | undefined {
  const u = safeHref(v)
  return u && !u.startsWith("#") ? u : undefined
}
/** A CTA needs BOTH a label and a usable href, else it's dropped. */
function optCta(v: unknown): CtaLink | undefined {
  const r = record(v)
  const label = str(r.label, 80)
  const href = safeHref(r.href)
  return label && href ? { label, href } : undefined
}
/** Map an unknown value to an array of items, clamping count. */
function items<T>(v: unknown, max: number, map: (r: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(v)) return []
  const out: T[] = []
  for (const raw of v) {
    const item = map(record(raw))
    if (item) out.push(item)
    if (out.length >= max) break
  }
  return out
}

// ─── newsFeed cross-module allowlist ─────────────────────────────────────────
// Only website-appropriate AI-Comms formats may surface on a public site — never
// fundraising emails or social posts. Both the newsFeed block and the /news detail
// route guard against this list.
export const WEBSITE_NEWS_TYPES = ["press_release", "op_ed", "event_announcement", "letter_to_editor"] as const
const DEFAULT_NEWS_TYPES = ["press_release", "op_ed", "event_announcement"]

// ─── Registry ────────────────────────────────────────────────────────────────

/**
 * How a block gets its content — drives the editor palette grouping and the
 * "Automatic" badge:
 *  - `content`: the editor writes the words (hero, text, issues, …).
 *  - `dynamic`: auto-populates from data elsewhere and stays current (candidates,
 *    news feed, press, newsletter archive) — only its heading/intro are editable.
 *  - `form`: an interactive block that collects input (volunteer / newsletter signup).
 */
export type BlockKind = "content" | "dynamic" | "form"

export interface BlockSpec<P> {
  type: string
  label: string
  description: string
  tier: "core" | "optional"
  kind: BlockKind
  /** Seed for "add block" in the editor. */
  defaultProps: () => P
  /** Clamp + sanitize arbitrary input into valid props. Runs on every write. */
  validate: (raw: unknown) => P
}

export const BLOCK_SPECS = {
  hero: {
    type: "hero",
    label: "Hero",
    description: "Page header / banner with a headline, optional subhead, headshot, and up to two buttons.",
    tier: "core",
    kind: "content",
    defaultProps: (): HeroProps => ({
      headline: "",
      showHeadshot: true,
      primaryCta: { label: "Join the campaign", href: "#volunteer" },
    }),
    validate: (raw: unknown): HeroProps => {
      const r = record(raw)
      const props: HeroProps = { headline: str(r.headline, 200) }
      const subhead = optStr(r.subhead, 500)
      if (subhead) props.subhead = subhead
      if (r.showHeadshot !== undefined) props.showHeadshot = !!r.showHeadshot
      const imageUrl = safeImageUrl(r.imageUrl)
      if (imageUrl) props.imageUrl = imageUrl
      const primary = optCta(r.primaryCta)
      if (primary) props.primaryCta = primary
      const secondary = optCta(r.secondaryCta)
      if (secondary) props.secondaryCta = secondary
      return props
    },
  } satisfies BlockSpec<HeroProps>,

  richText: {
    type: "richText",
    label: "Text section",
    description:
      "A prose section (e.g. About) with an optional heading and button. Body is plain text; blank lines separate paragraphs.",
    tier: "core",
    kind: "content",
    defaultProps: (): RichTextProps => ({ body: "" }),
    validate: (raw: unknown): RichTextProps => {
      const r = record(raw)
      const props: RichTextProps = { body: str(r.body, 8000) }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const cta = optCta(r.cta)
      if (cta) props.cta = cta
      return props
    },
  } satisfies BlockSpec<RichTextProps>,

  image: {
    type: "image",
    label: "Image",
    description: "A single image, with optional alt text and caption.",
    tier: "optional",
    kind: "content",
    defaultProps: (): ImageProps => ({ url: "" }),
    validate: (raw: unknown): ImageProps => {
      const r = record(raw)
      const props: ImageProps = { url: safeImageUrl(r.url) ?? "" }
      const alt = optStr(r.alt, 300)
      if (alt) props.alt = alt
      const caption = optStr(r.caption, 500)
      if (caption) props.caption = caption
      return props
    },
  } satisfies BlockSpec<ImageProps>,

  issuesGrid: {
    type: "issuesGrid",
    label: "Issues grid",
    description: 'Cards of positions ("Where I stand"), each a title + short body.',
    tier: "core",
    kind: "content",
    defaultProps: (): IssuesGridProps => ({ heading: "Where I stand", items: [] }),
    validate: (raw: unknown): IssuesGridProps => {
      const r = record(raw)
      const props: IssuesGridProps = {
        items: items(r.items, 12, (i) => {
          const title = str(i.title, 200)
          const body = str(i.body, 4000)
          return title && body ? { title, body } : null
        }),
      }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<IssuesGridProps>,

  candidates: {
    type: "candidates",
    label: "Candidates",
    description:
      "Dynamic — lists this committee's candidates (name, office, headshot), each linking to their own profile page. Stays current as candidates are added or removed.",
    tier: "core",
    kind: "dynamic",
    defaultProps: (): CandidatesProps => ({ heading: "Our candidates" }),
    validate: (raw: unknown): CandidatesProps => {
      const r = record(raw)
      const props: CandidatesProps = {}
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<CandidatesProps>,

  volunteerForm: {
    type: "volunteerForm",
    label: "Volunteer form",
    description: "The volunteer signup form. Submissions go to the moderation queue in Contacts.",
    tier: "core",
    kind: "form",
    defaultProps: (): VolunteerFormProps => ({ heading: "Get involved" }),
    validate: (raw: unknown): VolunteerFormProps => {
      const r = record(raw)
      const props: VolunteerFormProps = {}
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<VolunteerFormProps>,

  newsletterSignup: {
    type: "newsletterSignup",
    label: "Newsletter signup",
    description:
      "An email-newsletter signup form. Visitors enter their email; they receive a confirmation link (double opt-in) and, once confirmed, get the campaign's newsletters.",
    tier: "optional",
    kind: "form",
    defaultProps: (): NewsletterSignupProps => ({
      heading: "Subscribe to our newsletter",
      buttonLabel: "Subscribe",
    }),
    validate: (raw: unknown): NewsletterSignupProps => {
      const r = record(raw)
      const props: NewsletterSignupProps = {}
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      const buttonLabel = optStr(r.buttonLabel, 80)
      if (buttonLabel) props.buttonLabel = buttonLabel
      return props
    },
  } satisfies BlockSpec<NewsletterSignupProps>,

  cta: {
    type: "cta",
    label: "Call to action",
    description: "A standalone action band with a heading, text, and one button (Donate / Chip in / RSVP).",
    tier: "optional",
    kind: "content",
    defaultProps: (): CtaBandProps => ({ buttonLabel: "Donate", href: "" }),
    validate: (raw: unknown): CtaBandProps => {
      const r = record(raw)
      const props: CtaBandProps = {
        buttonLabel: str(r.buttonLabel, 80) || "Learn more",
        href: safeHref(r.href) ?? "#",
      }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const text = optStr(r.text, 800)
      if (text) props.text = text
      return props
    },
  } satisfies BlockSpec<CtaBandProps>,

  endorsements: {
    type: "endorsements",
    label: "Endorsements",
    description: "Endorsement / quote cards — each a name, optional role, and optional quote.",
    tier: "optional",
    kind: "content",
    defaultProps: (): EndorsementsProps => ({ heading: "Endorsements", items: [] }),
    validate: (raw: unknown): EndorsementsProps => {
      const r = record(raw)
      const props: EndorsementsProps = {
        items: items(r.items, 24, (i) => {
          const name = str(i.name, 200)
          if (!name) return null
          const item: { name: string; role?: string; quote?: string } = { name }
          const role = optStr(i.role, 200)
          if (role) item.role = role
          const quote = optStr(i.quote, 1000)
          if (quote) item.quote = quote
          return item
        }),
      }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<EndorsementsProps>,

  newsFeed: {
    type: "newsFeed",
    label: "News & updates",
    description:
      "Dynamic — automatically shows the campaign's published AI-Communications pieces (press releases, op-eds, event announcements). Stays fresh as you publish.",
    tier: "optional",
    kind: "dynamic",
    defaultProps: (): NewsFeedProps => ({
      heading: "News & updates",
      types: [...DEFAULT_NEWS_TYPES],
      limit: 5,
    }),
    validate: (raw: unknown): NewsFeedProps => {
      const r = record(raw)
      const allowed = new Set<string>(WEBSITE_NEWS_TYPES)
      const requested = Array.isArray(r.types)
        ? r.types.filter((t): t is string => typeof t === "string" && allowed.has(t))
        : []
      const types = requested.length > 0 ? Array.from(new Set(requested)) : [...DEFAULT_NEWS_TYPES]
      const rawLimit = typeof r.limit === "number" && Number.isFinite(r.limit) ? Math.floor(r.limit) : 5
      const props: NewsFeedProps = { types, limit: Math.min(Math.max(rawLimit, 1), 20) }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<NewsFeedProps>,

  pressMentions: {
    type: "pressMentions",
    label: "In the news",
    description:
      "Dynamic — shows approved press coverage about the candidate (found via web search or added by URL, then reviewed in the Press coverage manager). It has no manual items here.",
    tier: "optional",
    kind: "dynamic",
    defaultProps: (): PressMentionsProps => ({ heading: "In the news", limit: 6 }),
    validate: (raw: unknown): PressMentionsProps => {
      const r = record(raw)
      const rawLimit = typeof r.limit === "number" && Number.isFinite(r.limit) ? Math.floor(r.limit) : 6
      const props: PressMentionsProps = { limit: Math.min(Math.max(rawLimit, 1), 20) }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<PressMentionsProps>,

  newsletterArchive: {
    type: "newsletterArchive",
    label: "Newsletter archive",
    description:
      "Dynamic — lists the campaign's published newsletters, newest first, each linking to the full issue. Managed in the Newsletters manager.",
    tier: "optional",
    kind: "dynamic",
    defaultProps: (): NewsletterArchiveProps => ({ heading: "Newsletter", limit: 5 }),
    validate: (raw: unknown): NewsletterArchiveProps => {
      const r = record(raw)
      const rawLimit = typeof r.limit === "number" && Number.isFinite(r.limit) ? Math.floor(r.limit) : 5
      const props: NewsletterArchiveProps = { limit: Math.min(Math.max(rawLimit, 1), 20) }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<NewsletterArchiveProps>,

  events: {
    type: "events",
    label: "Events",
    description: "Upcoming events — each a title, optional date, location, and description.",
    tier: "optional",
    kind: "content",
    defaultProps: (): EventsProps => ({ heading: "Upcoming events", items: [] }),
    validate: (raw: unknown): EventsProps => {
      const r = record(raw)
      const props: EventsProps = {
        items: items(r.items, 24, (i) => {
          const title = str(i.title, 200)
          if (!title) return null
          const item: { title: string; date?: string; location?: string; description?: string } = { title }
          const date = optStr(i.date, 100)
          if (date) item.date = date
          const location = optStr(i.location, 200)
          if (location) item.location = location
          const description = optStr(i.description, 1000)
          if (description) item.description = description
          return item
        }),
      }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<EventsProps>,

  faq: {
    type: "faq",
    label: "FAQ",
    description: "A list of questions and answers.",
    tier: "optional",
    kind: "content",
    defaultProps: (): FaqProps => ({ heading: "Frequently asked questions", items: [] }),
    validate: (raw: unknown): FaqProps => {
      const r = record(raw)
      const props: FaqProps = {
        items: items(r.items, 24, (i) => {
          const q = str(i.q, 500)
          const a = str(i.a, 4000)
          return q && a ? { q, a } : null
        }),
      }
      const heading = optStr(r.heading, 200)
      if (heading) props.heading = heading
      const intro = optStr(r.intro, 800)
      if (intro) props.intro = intro
      return props
    },
  } satisfies BlockSpec<FaqProps>,
} as const

export type BlockType = keyof typeof BLOCK_SPECS

/** Palette display order: core blocks first, then optional. */
export const BLOCK_ORDER: BlockType[] = [
  "hero",
  "richText",
  "image",
  "candidates",
  "issuesGrid",
  "volunteerForm",
  "newsletterSignup",
  "cta",
  "endorsements",
  "newsFeed",
  "pressMentions",
  "newsletterArchive",
  "events",
  "faq",
]

export function isBlockType(v: unknown): v is BlockType {
  return typeof v === "string" && v in BLOCK_SPECS
}

/** Palette groups, in display order — used by the editor's "Add section" picker. */
export const BLOCK_GROUPS: { kind: BlockKind; label: string; hint: string }[] = [
  { kind: "content", label: "Content", hint: "Sections you write yourself." },
  { kind: "dynamic", label: "Automatic", hint: "Populate from your data and stay current." },
  { kind: "form", label: "Forms & signup", hint: "Collect volunteers and subscribers." },
]

/** Block types for one palette group, in `BLOCK_ORDER`. */
export function blockTypesForKind(kind: BlockKind): BlockType[] {
  return BLOCK_ORDER.filter((t) => BLOCK_SPECS[t].kind === kind)
}

/**
 * A one-line preview of a block's content for the collapsed section card. Pure +
 * defensive (props are untrusted `Record<string, unknown>`). Dynamic blocks have no
 * authored body, so they fall back to a short "auto" note.
 */
export function blockSummary(type: string, props: Record<string, unknown>): string {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
  const first = (v: unknown, ...keys: string[]): string => {
    if (!Array.isArray(v) || v.length === 0) return ""
    const row = v[0] && typeof v[0] === "object" ? (v[0] as Record<string, unknown>) : {}
    for (const k of keys) {
      const t = str(row[k])
      if (t) return t
    }
    return ""
  }
  const clip = (t: string) => (t.length > 80 ? `${t.slice(0, 80)}…` : t)

  switch (type) {
    case "hero":
      return clip(str(props.headline)) || "No headline yet"
    case "richText":
      return clip(str(props.heading) || str(props.body)) || "Empty text section"
    case "image":
      return str(props.url) ? clip(str(props.alt) || str(props.caption)) || "Image" : "No image yet"
    case "cta":
      return clip(str(props.heading) || str(props.buttonLabel)) || "Call to action"
    case "issuesGrid": {
      const n = Array.isArray(props.items) ? props.items.length : 0
      return n ? `${n} ${n === 1 ? "issue" : "issues"}` : "No issues yet"
    }
    case "endorsements": {
      const n = Array.isArray(props.items) ? props.items.length : 0
      return n ? `${n} ${n === 1 ? "endorsement" : "endorsements"}` : "No endorsements yet"
    }
    case "events": {
      const n = Array.isArray(props.items) ? props.items.length : 0
      return n ? `${n} ${n === 1 ? "event" : "events"} · ${first(props.items, "title")}` : "No events yet"
    }
    case "faq": {
      const n = Array.isArray(props.items) ? props.items.length : 0
      return n ? `${n} ${n === 1 ? "question" : "questions"}` : "No questions yet"
    }
    case "candidates":
      return "Lists your committee's candidates"
    case "newsFeed":
      return "Latest published news & updates"
    case "pressMentions":
      return "Approved press coverage"
    case "newsletterArchive":
      return "Published newsletter issues"
    case "volunteerForm":
      return clip(str(props.heading)) || "Volunteer signup form"
    case "newsletterSignup":
      return clip(str(props.heading)) || "Newsletter signup form"
    default:
      return ""
  }
}

/**
 * Validate an arbitrary (type, props) pair for a write. Returns the block type and
 * its sanitized props, or null if the type is unknown. Callers persist `props` as-is.
 */
export function validateBlock(type: unknown, rawProps: unknown): { type: BlockType; props: unknown } | null {
  if (!isBlockType(type)) return null
  return { type, props: BLOCK_SPECS[type].validate(rawProps) }
}
