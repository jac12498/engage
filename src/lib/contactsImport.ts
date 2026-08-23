// Shared helpers for the "Load list" contact importer — pure functions usable
// from both the server actions (parsing/import) and the client wizard (mapping
// UI + preview). No server-only imports here.

import { CONTACT_TYPES } from "@/lib/contacts"

/**
 * A target field a spreadsheet column can map to. Emails, phones, and addresses
 * carry their type in the key (e.g. `homeStreet`, `mailingCity`) so one file can
 * hold several typed addresses at once.
 */
export type FieldKey =
  | "ignore"
  | "firstName"
  | "lastName"
  | "fullName"
  | "emailPersonal"
  | "emailWork"
  | "emailGovernmental"
  | "emailUnknown"
  | "phoneMobile"
  | "phoneLandline"
  | "phoneUnknown"
  | "homeStreet" | "homeLine2" | "homeCity" | "homeState" | "homeZip"
  | "mailingStreet" | "mailingLine2" | "mailingCity" | "mailingState" | "mailingZip"
  | "unknownStreet" | "unknownLine2" | "unknownCity" | "unknownState" | "unknownZip"
  | "tags"

// Labels are self-descriptive (e.g. "Street – Home") so the collapsed <select>
// stays unambiguous, while `group` drives the <optgroup> headers in the open list.
const addrGroup = (prefix: "home" | "mailing" | "unknown", group: string, type: string) =>
  [
    { key: `${prefix}Street`, label: `Street – ${type}`, group },
    { key: `${prefix}Line2`, label: `Apt / suite – ${type}`, group },
    { key: `${prefix}City`, label: `City – ${type}`, group },
    { key: `${prefix}State`, label: `State – ${type}`, group },
    { key: `${prefix}Zip`, label: `ZIP – ${type}`, group },
  ] as { key: FieldKey; label: string; group: string }[]

export const FIELD_OPTIONS: { key: FieldKey; label: string; group: string }[] = [
  { key: "ignore", label: "Ignore", group: "General" },
  { key: "firstName", label: "First name", group: "Name" },
  { key: "lastName", label: "Last name", group: "Name" },
  { key: "fullName", label: "Full name", group: "Name" },
  { key: "emailPersonal", label: "Email – Personal", group: "Email" },
  { key: "emailWork", label: "Email – Work", group: "Email" },
  { key: "emailGovernmental", label: "Email – Governmental", group: "Email" },
  { key: "emailUnknown", label: "Email – Unknown", group: "Email" },
  { key: "phoneMobile", label: "Phone – Mobile", group: "Phone" },
  { key: "phoneLandline", label: "Phone – Landline", group: "Phone" },
  { key: "phoneUnknown", label: "Phone – Unknown", group: "Phone" },
  ...addrGroup("home", "Home address", "Home"),
  ...addrGroup("mailing", "Mailing address", "Mailing"),
  ...addrGroup("unknown", "Other address", "Other"),
  { key: "tags", label: "Tags", group: "Tags" },
]

const EMAIL_LABEL: Partial<Record<FieldKey, string>> = {
  emailPersonal: "Personal",
  emailWork: "Work",
  emailGovernmental: "Governmental",
  emailUnknown: "Unknown",
}
const PHONE_LABEL: Partial<Record<FieldKey, string>> = {
  phoneMobile: "Mobile",
  phoneLandline: "Landline",
  phoneUnknown: "Unknown",
}
const ADDRESS_TYPES: { prefix: "home" | "mailing" | "unknown"; label: string }[] = [
  { prefix: "home", label: "Home" },
  { prefix: "mailing", label: "Mailing" },
  { prefix: "unknown", label: "Unknown" },
]

export interface ImportColumn {
  index: number
  header: string
  samples: string[]
  field: FieldKey
}

export interface ParsedSheet {
  columns: ImportColumn[]
  rows: string[][]
  rowCount: number
}

export interface LabeledValue {
  label: string
  value: string
}

export interface AddressDraft {
  label: string
  line1: string
  line2: string
  city: string
  state: string
  zip: string
}

export interface ImportContactDraft {
  firstName: string
  lastName: string
  emails: LabeledValue[]
  phones: LabeledValue[]
  addresses: AddressDraft[]
  tags: string[]
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")

/** Best-guess a field for a header name. Returns "ignore" when nothing matches. */
export function guessField(header: string): FieldKey {
  const h = norm(header)
  if (!h) return "ignore"
  const has = (...subs: string[]) => subs.some((s) => h.includes(s))

  if (h === "firstname" || h === "first" || h === "fname" || has("givenname") || h === "given") return "firstName"
  if (h === "lastname" || h === "last" || h === "lname" || has("surname", "familyname")) return "lastName"
  if (has("email")) {
    if (has("work", "office", "business")) return "emailWork"
    if (has("gov")) return "emailGovernmental"
    return "emailPersonal"
  }
  if (has("phone", "mobile", "cell", "tel", "landline")) {
    if (has("mobile", "cell")) return "phoneMobile"
    if (has("landline", "land") || h.includes("homephone") || h.includes("housephone")) return "phoneLandline"
    return "phoneUnknown"
  }
  // Address parts — the type comes from "home"/"mail" in the header, else "unknown".
  const t = has("mail") ? "mailing" : has("home") ? "home" : "unknown"
  if (has("addressline2", "address2", "apt", "suite", "unit") || h === "line2") return `${t}Line2` as FieldKey
  if (has("address", "street") || h === "addr" || h === "line1") return `${t}Street` as FieldKey
  if (has("city", "town")) return `${t}City` as FieldKey
  if (h === "state" || h === "st" || has("province", "region")) return `${t}State` as FieldKey
  if (has("zip", "postal", "postcode")) return `${t}Zip` as FieldKey
  if (has("tag", "type", "category", "segment")) return "tags"
  if (has("fullname", "name", "contact")) return "fullName"
  return "ignore"
}

/** Split a full-name string into first/last. Handles "Last, First" and "First Last". */
export function splitFullName(full: string): { firstName: string; lastName: string } {
  const v = full.trim()
  if (!v) return { firstName: "", lastName: "" }
  if (v.includes(",")) {
    const [last, first] = v.split(",")
    return { firstName: (first ?? "").trim(), lastName: (last ?? "").trim() }
  }
  const parts = v.split(/\s+/)
  if (parts.length === 1) return { firstName: "", lastName: parts[0] }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") }
}

const VALID_TAGS = new Set<string>(CONTACT_TYPES as readonly string[])

/** Assemble a contact draft (with 0+ typed addresses) from one row. Null when no name. */
export function rowToContact(row: string[], columns: { index: number; field: FieldKey }[]): ImportContactDraft | null {
  const cell = (i: number) => (row[i] ?? "").toString().trim()
  const firstOf = (field: FieldKey) => columns.filter((c) => c.field === field).map((c) => cell(c.index)).find(Boolean) ?? ""

  let firstName = firstOf("firstName")
  let lastName = firstOf("lastName")
  const full = firstOf("fullName")
  if (!firstName && !lastName && full) {
    const s = splitFullName(full)
    firstName = s.firstName
    lastName = s.lastName
  }
  if (!firstName && !lastName) return null

  const collectLabeled = (labels: Partial<Record<FieldKey, string>>, splitRe: RegExp): LabeledValue[] => {
    const out: LabeledValue[] = []
    const seen = new Set<string>()
    for (const c of columns) {
      const label = labels[c.field]
      if (!label) continue
      for (const raw of cell(c.index).split(splitRe)) {
        const value = raw.trim()
        if (!value) continue
        const k = value.toLowerCase()
        if (seen.has(k)) continue
        seen.add(k)
        out.push({ label, value })
      }
    }
    return out
  }

  const emails = collectLabeled(EMAIL_LABEL, /[;,]/)
  const phones = collectLabeled(PHONE_LABEL, /[;,/]/)

  const addresses: AddressDraft[] = []
  for (const { prefix, label } of ADDRESS_TYPES) {
    const line1 = firstOf(`${prefix}Street` as FieldKey)
    if (!line1) continue
    addresses.push({
      label,
      line1,
      line2: firstOf(`${prefix}Line2` as FieldKey),
      city: firstOf(`${prefix}City` as FieldKey),
      state: firstOf(`${prefix}State` as FieldKey),
      zip: firstOf(`${prefix}Zip` as FieldKey),
    })
  }

  const seenTags = new Set<string>()
  const tags: string[] = []
  for (const c of columns) {
    if (c.field !== "tags") continue
    for (const raw of cell(c.index).split(/[;,]/)) {
      const tg = raw.trim().toLowerCase()
      if (VALID_TAGS.has(tg) && !seenTags.has(tg)) {
        seenTags.add(tg)
        tags.push(tg)
      }
    }
  }

  return { firstName, lastName, emails, phones, addresses, tags }
}

/** Normalized identity used to skip / match contacts (matches importDonors). */
export function nameKey(firstName: string, lastName: string): string {
  return `${firstName.trim().toUpperCase()}|${lastName.trim().toUpperCase()}`
}
