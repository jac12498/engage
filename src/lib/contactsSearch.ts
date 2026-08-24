// Advanced contact search model — a query is groups OR'd together, each group a
// set of conditions AND'd together, each condition = field → operator → value.
// Pure + serializable (no server-only), so the client builder, the client-side
// matcher, and a future saved-search feature all share it.

import type { ContactFieldDef, ContactFieldType } from "@/lib/contactFields"

export type OpCategory = "text" | "number" | "multiSelect" | "boolean" | "date"

export type Operator =
  | "contains"
  | "notContains"
  | "equals"
  | "startsWith"
  | "isEmpty"
  | "isNotEmpty"
  | "anyOf"
  | "noneOf"
  | "is"
  | "on"
  | "before"
  | "after"
  | "between"
  | "gt"
  | "lt"

/** Built-in field keys; custom fields use the key `cf:<fieldId>`. */
export type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "city"
  | "state"
  | "zip"
  | "tags"
  | "source"
  | "hasEmail"
  | "hasPhone"
  | "hasAddress"
  | "notes"
  | "dateAdded"

export interface FieldDef {
  /** A FieldKey (built-in) or `cf:<fieldId>` (custom). */
  key: string
  label: string
  group: string
  category: OpCategory
  /** Choices for a multiSelect field. */
  options?: { value: string; label: string }[]
}

export const FIELDS: FieldDef[] = [
  { key: "firstName", label: "First name", group: "Name", category: "text" },
  { key: "lastName", label: "Last name", group: "Name", category: "text" },
  { key: "email", label: "Email", group: "Contact info", category: "text" },
  { key: "phone", label: "Phone", group: "Contact info", category: "text" },
  { key: "city", label: "City", group: "Address", category: "text" },
  { key: "state", label: "State", group: "Address", category: "text" },
  { key: "zip", label: "ZIP", group: "Address", category: "text" },
  // Tag options are injected at render (committee tags), not static here.
  { key: "tags", label: "Tags", group: "Classification", category: "multiSelect" },
  {
    key: "source",
    label: "Source",
    group: "Classification",
    category: "multiSelect",
    options: [
      { value: "manual", label: "Added manually" },
      { value: "volunteer_signup", label: "Website signup" },
      { value: "import", label: "Imported" },
    ],
  },
  { key: "hasEmail", label: "Has email", group: "Data quality", category: "boolean" },
  { key: "hasPhone", label: "Has phone", group: "Data quality", category: "boolean" },
  { key: "hasAddress", label: "Has address", group: "Data quality", category: "boolean" },
  { key: "notes", label: "Notes", group: "Other", category: "text" },
  { key: "dateAdded", label: "Date added", group: "Other", category: "date" },
]

export const FIELD_BY_KEY: Record<string, FieldDef> = Object.fromEntries(FIELDS.map((f) => [f.key, f]))

export const OPERATORS: Record<OpCategory, { value: Operator; label: string; valueless?: boolean }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "notContains", label: "does not contain" },
    { value: "equals", label: "is" },
    { value: "startsWith", label: "starts with" },
    { value: "isEmpty", label: "is empty", valueless: true },
    { value: "isNotEmpty", label: "is not empty", valueless: true },
  ],
  number: [
    { value: "equals", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
    { value: "between", label: "between" },
    { value: "isEmpty", label: "is empty", valueless: true },
    { value: "isNotEmpty", label: "is not empty", valueless: true },
  ],
  multiSelect: [
    { value: "anyOf", label: "is any of" },
    { value: "noneOf", label: "is none of" },
  ],
  boolean: [{ value: "is", label: "is" }],
  date: [
    { value: "on", label: "on" },
    { value: "before", label: "before" },
    { value: "after", label: "after" },
    { value: "between", label: "between" },
  ],
}

export interface Condition {
  id: string
  /** A FieldKey (built-in) or `cf:<fieldId>` (custom). */
  field: string
  op: Operator
  value: string
  /** Second bound, for date/number "between". */
  value2?: string
  /** Selected values, for multiSelect fields. */
  values?: string[]
}

export interface Group {
  id: string
  conditions: Condition[]
}

export type SearchQuery = Group[]

let seq = 0
const uid = () => `q${seq++}${Date.now().toString(36)}`

function categoryOf(field: string, fieldMap?: Map<string, FieldDef>): OpCategory {
  return fieldMap?.get(field)?.category ?? FIELD_BY_KEY[field]?.category ?? "text"
}

export function newCondition(field = "lastName", fieldMap?: Map<string, FieldDef>): Condition {
  const category = categoryOf(field, fieldMap)
  return { id: uid(), field, op: OPERATORS[category][0].value, value: category === "boolean" ? "yes" : "", values: [] }
}
export function newGroup(fieldMap?: Map<string, FieldDef>): Group {
  return { id: uid(), conditions: [newCondition("lastName", fieldMap)] }
}

/** The default operator + reset value shape when a field changes category. */
export function defaultOpFor(field: string, fieldMap?: Map<string, FieldDef>): Operator {
  return OPERATORS[categoryOf(field, fieldMap)][0].value
}

// ─── Custom field integration ─────────────────────────────────────────────────

function customCategory(type: ContactFieldType): OpCategory {
  switch (type) {
    case "number": return "number"
    case "boolean": return "boolean"
    case "date": return "date"
    case "select":
    case "multiselect": return "multiSelect"
    default: return "text"
  }
}

/** Merge the built-in search fields with the committee's custom fields. */
export function buildSearchFields(customFields: ContactFieldDef[]): FieldDef[] {
  const custom: FieldDef[] = customFields.map((f) => ({
    key: `cf:${f.id}`,
    label: f.label,
    group: "Custom fields",
    category: customCategory(f.type),
    options: f.type === "select" || f.type === "multiselect" ? f.options.map((o) => ({ value: o, label: o })) : undefined,
  }))
  return [...FIELDS, ...custom]
}

export function fieldMapOf(fields: FieldDef[]): Map<string, FieldDef> {
  return new Map(fields.map((f) => [f.key, f]))
}

// ─── Matching ────────────────────────────────────────────────────────────────

/** The minimal contact shape the matcher reads (ContactRow satisfies this). */
export interface SearchableContact {
  firstName: string
  lastName: string
  emails: { email: string }[]
  phones: { phone: string }[]
  addresses: { city: string | null; state: string | null; zip: string | null }[]
  types: string[]
  source: string
  createdAt: string
  notes: { body: string }[]
  customFields?: Record<string, unknown>
}

const digits = (p: string) => p.replace(/\D/g, "")
const customVal = (c: SearchableContact, key: string) => (c.customFields ?? {})[key.slice(3)]
const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
const asArray = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v != null && v !== "" ? [String(v)] : [])

/** Candidate strings a built-in text field compares against. */
function textCandidates(c: SearchableContact, field: string): string[] {
  switch (field) {
    case "firstName": return [c.firstName]
    case "lastName": return [c.lastName]
    case "email": return c.emails.map((e) => e.email)
    case "phone": return c.phones.flatMap((p) => [p.phone, digits(p.phone)])
    case "city": return c.addresses.map((a) => a.city ?? "")
    case "state": return c.addresses.map((a) => a.state ?? "")
    case "zip": return c.addresses.map((a) => a.zip ?? "")
    case "notes": return c.notes.map((n) => n.body)
    default: return []
  }
}

function isComplete(cond: Condition, fieldMap: Map<string, FieldDef>): boolean {
  const def = fieldMap.get(cond.field)
  if (!def) return false
  const opDef = OPERATORS[def.category].find((o) => o.value === cond.op)
  if (opDef?.valueless) return true
  if (def.category === "multiSelect") return (cond.values?.length ?? 0) > 0
  if (def.category === "boolean") return cond.value === "yes" || cond.value === "no"
  if ((def.category === "date" || def.category === "number") && cond.op === "between") return !!cond.value && !!cond.value2
  return cond.value.trim() !== ""
}

function matchText(candidates: string[], op: Operator, value: string): boolean {
  const v = value.trim().toLowerCase()
  const nonEmpty = candidates.map((x) => x.toLowerCase()).filter(Boolean)
  switch (op) {
    case "isEmpty": return nonEmpty.length === 0
    case "isNotEmpty": return nonEmpty.length > 0
    case "contains": return nonEmpty.some((x) => x.includes(v))
    case "notContains": return !nonEmpty.some((x) => x.includes(v))
    case "equals": return nonEmpty.some((x) => x === v)
    case "startsWith": return nonEmpty.some((x) => x.startsWith(v))
    default: return false
  }
}

function matchNumber(v: number | null, cond: Condition): boolean {
  if (cond.op === "isEmpty") return v == null
  if (cond.op === "isNotEmpty") return v != null
  if (v == null) return false
  const n = parseFloat(cond.value)
  if (!Number.isFinite(n)) return false
  switch (cond.op) {
    case "equals": return v === n
    case "gt": return v > n
    case "lt": return v < n
    case "between": {
      const n2 = parseFloat(cond.value2 ?? "")
      return Number.isFinite(n2) && v >= n && v <= n2
    }
    default: return false
  }
}

function matchDate(iso: string, cond: Condition): boolean {
  const d = iso.slice(0, 10)
  switch (cond.op) {
    case "on": return d === cond.value
    case "before": return d < cond.value
    case "after": return d > cond.value
    case "between": return d >= cond.value && d <= cond.value2!
    default: return false
  }
}

function matchCondition(c: SearchableContact, cond: Condition, def: FieldDef): boolean {
  const isCustom = cond.field.startsWith("cf:")
  switch (def.category) {
    case "text": {
      const candidates = isCustom ? [String(customVal(c, cond.field) ?? "")] : textCandidates(c, cond.field)
      return matchText(candidates, cond.op, cond.value)
    }
    case "number":
      return matchNumber(toNum(customVal(c, cond.field)), cond)
    case "date":
      return matchDate(isCustom ? String(customVal(c, cond.field) ?? "") : c.createdAt, cond)
    case "boolean": {
      const has = isCustom
        ? customVal(c, cond.field) === true
        : cond.field === "hasEmail" ? c.emails.length > 0
        : cond.field === "hasPhone" ? c.phones.length > 0
        : cond.field === "hasAddress" ? c.addresses.length > 0
        : false
      return has === (cond.value === "yes")
    }
    case "multiSelect": {
      const set = isCustom ? asArray(customVal(c, cond.field)) : cond.field === "tags" ? c.types : [c.source]
      const selected = cond.values ?? []
      const any = selected.some((s) => set.includes(s))
      return cond.op === "anyOf" ? any : !any
    }
    default:
      return true
  }
}

/** True when the contact satisfies the query (groups OR'd, complete conditions AND'd). */
export function matchContact(c: SearchableContact, query: SearchQuery, fieldMap: Map<string, FieldDef>): boolean {
  const active = query.filter((g) => g.conditions.some((cond) => isComplete(cond, fieldMap)))
  if (active.length === 0) return true
  return active.some((g) =>
    g.conditions
      .filter((cond) => isComplete(cond, fieldMap))
      .every((cond) => {
        const def = fieldMap.get(cond.field)
        return def ? matchCondition(c, cond, def) : true
      }),
  )
}

/** Count of complete conditions across the query (for the "active" badge). */
export function conditionCount(query: SearchQuery, fieldMap: Map<string, FieldDef>): number {
  return query.reduce((n, g) => n + g.conditions.filter((cond) => isComplete(cond, fieldMap)).length, 0)
}
