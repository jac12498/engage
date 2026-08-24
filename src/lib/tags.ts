// Contact tag vocabulary — the fixed built-in tags plus (resolved server-side)
// each committee's custom tags. Client-safe (no server-only): components render
// from a `TagDef[]` passed down from the page.

export interface TagDef {
  slug: string
  label: string
  color: string
  /** True for the fixed built-in tags (can't be renamed/removed). */
  builtin?: boolean
}

/** Fixed built-in tags. `donor`/`voter` are also set by other flows, so they stay. */
export const DEFAULT_TAGS: TagDef[] = [
  { slug: "supporter", label: "Supporter", color: "#1b3a6b", builtin: true },
  { slug: "volunteer", label: "Volunteer", color: "#1e6b3a", builtin: true },
  { slug: "donor", label: "Donor", color: "#c4910a", builtin: true },
  { slug: "voter", label: "Voter", color: "#6b1b5a", builtin: true },
  { slug: "prospect", label: "Prospect", color: "#4b5563", builtin: true },
  { slug: "other", label: "Other", color: "#6b7280", builtin: true },
]

export const BUILTIN_SLUGS = new Set(DEFAULT_TAGS.map((t) => t.slug))

/** Preset colors offered when creating a custom tag. */
export const TAG_COLORS = [
  "#1b3a6b", "#1e6b3a", "#c4910a", "#6b1b5a", "#b91c1c",
  "#0e7490", "#6d28d9", "#be185d", "#4b5563", "#0f766e",
]

/** Inline style for a tag badge: a soft tinted background with the tag's color. */
export function tagBadgeStyle(color: string): { backgroundColor: string; color: string } {
  return { backgroundColor: `${color}1f`, color } // ~12% alpha background
}

export function buildTagMap(tags: TagDef[]): Map<string, TagDef> {
  return new Map(tags.map((t) => [t.slug, t]))
}

/** A URL-safe slug from a label ("Board Member" → "board-member"). */
export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}
