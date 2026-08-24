// Committee-defined custom contact fields — types, definitions, and value
// coercion/formatting. Client-safe (no server-only): pages load the defs and
// pass them down; values live in Contact.customFields JSON keyed by field id.

export type ContactFieldType =
  | "text"
  | "longtext"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "multiselect"
  | "url"

export const FIELD_TYPES: { type: ContactFieldType; label: string; hint: string }[] = [
  { type: "text", label: "Text", hint: "A short line of text" },
  { type: "longtext", label: "Long text", hint: "Multiple lines" },
  { type: "number", label: "Number", hint: "A numeric value" },
  { type: "boolean", label: "Yes / No", hint: "A checkbox" },
  { type: "date", label: "Date", hint: "A calendar date" },
  { type: "select", label: "Select", hint: "One of a list of choices" },
  { type: "multiselect", label: "Multi-select", hint: "Several of a list of choices" },
  { type: "url", label: "Link (URL)", hint: "A web address" },
]

export const FIELD_TYPE_LABELS: Record<ContactFieldType, string> = Object.fromEntries(
  FIELD_TYPES.map((t) => [t.type, t.label]),
) as Record<ContactFieldType, string>

export function fieldNeedsOptions(type: ContactFieldType): boolean {
  return type === "select" || type === "multiselect"
}

export interface ContactFieldDef {
  id: string
  label: string
  type: ContactFieldType
  /** Choices for select / multiselect. */
  options: string[]
}

/** A contact's custom-field values, keyed by field id. */
export type CustomFieldValues = Record<string, unknown>

/** Coerce a raw input into the stored value for a field type. Returns null when empty. */
export function coerceValue(type: ContactFieldType, raw: unknown): unknown {
  if (raw === null || raw === undefined) return null
  switch (type) {
    case "number": {
      const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, "").trim())
      return Number.isFinite(n) ? n : null
    }
    case "boolean":
      if (raw === true || raw === "true" || raw === "yes") return true
      if (raw === false || raw === "false" || raw === "no") return false
      return null
    case "multiselect": {
      const arr = Array.isArray(raw) ? raw.map(String) : String(raw).split(/[;,]/)
      const vals = [...new Set(arr.map((s) => s.trim()).filter(Boolean))]
      return vals.length ? vals : null
    }
    case "date": {
      const s = String(raw).trim()
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
    }
    default: {
      // text, longtext, url, select
      const s = String(raw).trim()
      return s || null
    }
  }
}

/** Human-readable display of a stored value. */
export function formatFieldValue(type: ContactFieldType, value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  switch (type) {
    case "boolean":
      return value ? "Yes" : "No"
    case "multiselect":
      return Array.isArray(value) ? value.join(", ") : String(value)
    case "date": {
      const s = String(value)
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!m) return s
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    }
    default:
      return String(value)
  }
}

export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)
}

/**
 * Coerce + validate a raw custom-field map (keyed by field id) against the
 * committee's field definitions. Unknown keys are dropped; select/multiselect
 * values are constrained to their defined choices; empty values are omitted.
 * Shared by contact save and the list importer so both behave identically.
 */
export function coerceCustomFields(
  defs: ContactFieldDef[],
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const byId = new Map(defs.map((f) => [f.id, f]))
  const out: Record<string, unknown> = {}
  for (const [id, r] of Object.entries(raw ?? {})) {
    const f = byId.get(id)
    if (!f) continue
    let v = coerceValue(f.type, r)
    // Constrain select/multiselect to defined choices, matching case/whitespace-
    // insensitively and normalizing to the option's canonical spelling.
    if (f.type === "select" && v != null) {
      v = matchOption(f.options, String(v)) ?? null
    }
    if (f.type === "multiselect" && Array.isArray(v)) {
      const kept = [...new Set((v as string[]).map((x) => matchOption(f.options, x)).filter((x): x is string => !!x))]
      v = kept.length ? kept : null
    }
    if (v != null) out[id] = v
  }
  return out
}

/** Find the defined option that matches `raw` ignoring case + surrounding space. */
function matchOption(options: string[], raw: string): string | undefined {
  const k = raw.trim().toLowerCase()
  return options.find((o) => o.toLowerCase() === k)
}
