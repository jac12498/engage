// Advanced contact search model — a query is groups OR'd together, each group a
// set of conditions AND'd together, each condition = field → operator → value.
// Pure + serializable (no server-only), so the client builder, the client-side
// matcher, and a future saved-search feature all share it.

import { CONTACT_TYPES } from "@/lib/contacts"

export type OpCategory = "text" | "multiSelect" | "boolean" | "date"

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
  key: FieldKey
  label: string
  group: string
  category: OpCategory
  /** Choices for a multiSelect field. */
  options?: { value: string; label: string }[]
}

const TYPE_LABELS: Record<string, string> = {
  supporter: "Supporter",
  volunteer: "Volunteer",
  donor: "Donor",
  voter: "Voter",
  prospect: "Prospect",
  other: "Other",
}

export const FIELDS: FieldDef[] = [
  { key: "firstName", label: "First name", group: "Name", category: "text" },
  { key: "lastName", label: "Last name", group: "Name", category: "text" },
  { key: "email", label: "Email", group: "Contact info", category: "text" },
  { key: "phone", label: "Phone", group: "Contact info", category: "text" },
  { key: "city", label: "City", group: "Address", category: "text" },
  { key: "state", label: "State", group: "Address", category: "text" },
  { key: "zip", label: "ZIP", group: "Address", category: "text" },
  {
    key: "tags",
    label: "Tags",
    group: "Classification",
    category: "multiSelect",
    options: CONTACT_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t })),
  },
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

export const FIELD_BY_KEY: Record<FieldKey, FieldDef> = Object.fromEntries(
  FIELDS.map((f) => [f.key, f]),
) as Record<FieldKey, FieldDef>

export const OPERATORS: Record<OpCategory, { value: Operator; label: string; valueless?: boolean }[]> = {
  text: [
    { value: "contains", label: "contains" },
    { value: "notContains", label: "does not contain" },
    { value: "equals", label: "is" },
    { value: "startsWith", label: "starts with" },
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
  field: FieldKey
  op: Operator
  value: string
  /** Second bound, for date "between". */
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

export function newCondition(field: FieldKey = "lastName"): Condition {
  const def = FIELD_BY_KEY[field]
  const op = OPERATORS[def.category][0].value
  return { id: uid(), field, op, value: def.category === "boolean" ? "yes" : "", values: [] }
}
export function newGroup(): Group {
  return { id: uid(), conditions: [newCondition()] }
}

/** The default operator + reset value shape when a field changes category. */
export function defaultOpFor(field: FieldKey): Operator {
  return OPERATORS[FIELD_BY_KEY[field].category][0].value
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
}

const digits = (p: string) => p.replace(/\D/g, "")

/** Candidate strings a text/date field compares against. */
function textCandidates(c: SearchableContact, field: FieldKey): string[] {
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

function isComplete(cond: Condition): boolean {
  const def = FIELD_BY_KEY[cond.field]
  const opDef = OPERATORS[def.category].find((o) => o.value === cond.op)
  if (opDef?.valueless) return true
  if (def.category === "multiSelect") return (cond.values?.length ?? 0) > 0
  if (def.category === "boolean") return cond.value === "yes" || cond.value === "no"
  if (def.category === "date" && cond.op === "between") return !!cond.value && !!cond.value2
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

function matchCondition(c: SearchableContact, cond: Condition): boolean {
  const def = FIELD_BY_KEY[cond.field]
  switch (def.category) {
    case "text":
      return matchText(textCandidates(c, cond.field), cond.op, cond.value)
    case "date":
      return matchDate(c.createdAt, cond)
    case "boolean": {
      const has =
        cond.field === "hasEmail" ? c.emails.length > 0 :
        cond.field === "hasPhone" ? c.phones.length > 0 :
        cond.field === "hasAddress" ? c.addresses.length > 0 : false
      return has === (cond.value === "yes")
    }
    case "multiSelect": {
      const set = cond.field === "tags" ? c.types : [c.source]
      const selected = cond.values ?? []
      const any = selected.some((s) => set.includes(s))
      return cond.op === "anyOf" ? any : !any
    }
    default:
      return true
  }
}

/** True when the contact satisfies the query (groups OR'd, complete conditions AND'd). */
export function matchContact(c: SearchableContact, query: SearchQuery): boolean {
  const activeGroups = query.filter((g) => g.conditions.some(isComplete))
  if (activeGroups.length === 0) return true
  return activeGroups.some((g) => g.conditions.filter(isComplete).every((cond) => matchCondition(c, cond)))
}

/** Count of complete conditions across the query (for the "active" badge). */
export function conditionCount(query: SearchQuery): number {
  return query.reduce((n, g) => n + g.conditions.filter(isComplete).length, 0)
}
