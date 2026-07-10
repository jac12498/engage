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
  primaryCta?: CtaLink
  secondaryCta?: CtaLink
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
export interface VolunteerFormProps {
  heading?: string
  intro?: string
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

export interface BlockSpec<P> {
  type: string
  label: string
  description: string
  tier: "core" | "optional"
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

  issuesGrid: {
    type: "issuesGrid",
    label: "Issues grid",
    description: 'Cards of positions ("Where I stand"), each a title + short body.',
    tier: "core",
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

  volunteerForm: {
    type: "volunteerForm",
    label: "Volunteer form",
    description: "The volunteer signup form. Submissions go to the moderation queue in Contacts.",
    tier: "core",
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

  cta: {
    type: "cta",
    label: "Call to action",
    description: "A standalone action band with a heading, text, and one button (Donate / Chip in / RSVP).",
    tier: "optional",
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

  events: {
    type: "events",
    label: "Events",
    description: "Upcoming events — each a title, optional date, location, and description.",
    tier: "optional",
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
  "issuesGrid",
  "volunteerForm",
  "cta",
  "endorsements",
  "newsFeed",
  "events",
  "faq",
]

export function isBlockType(v: unknown): v is BlockType {
  return typeof v === "string" && v in BLOCK_SPECS
}

/**
 * Validate an arbitrary (type, props) pair for a write. Returns the block type and
 * its sanitized props, or null if the type is unknown. Callers persist `props` as-is.
 */
export function validateBlock(type: unknown, rawProps: unknown): { type: BlockType; props: unknown } | null {
  if (!isBlockType(type)) return null
  return { type, props: BLOCK_SPECS[type].validate(rawProps) }
}
