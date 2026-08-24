// Builders for "list actions" on a filtered contact set — CSV text and printable
// HTML (mailing labels, phone list). Pure + client-safe; the action menu handles
// the actual download / print window.

import { formatPhone, normalizeLabel, EMAIL_LABELS, PHONE_LABELS, ADDRESS_LABELS } from "@/lib/contacts"
import { formatFieldValue, isEmptyValue, type ContactFieldDef } from "@/lib/contactFields"

export interface ExportAddress {
  label: string
  line1: string
  line2: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export interface ExportContact {
  id: string
  firstName: string
  lastName: string
  emails: { label: string; email: string }[]
  phones: { label: string; phone: string }[]
  addresses: ExportAddress[]
  types: string[]
  source: string
  createdAt: string
  /** Custom field values keyed by ContactField id. */
  customFields: Record<string, unknown>
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  volunteer_signup: "Website",
  import: "Import",
}

const nameLastFirst = (c: ExportContact) =>
  [c.lastName, c.firstName].filter(Boolean).join(", ") || [c.firstName, c.lastName].filter(Boolean).join(" ")

/** Preferred mailing address: a "Mailing" one, else "Home", else the first. */
export function mailingAddress(c: ExportContact): ExportAddress | null {
  if (c.addresses.length === 0) return null
  return (
    c.addresses.find((a) => a.label.toLowerCase() === "mailing") ??
    c.addresses.find((a) => a.label.toLowerCase() === "home") ??
    c.addresses[0]
  )
}

function cityStateZip(a: ExportAddress): string {
  const cs = [a.city, a.state].filter(Boolean).join(", ")
  return [cs, a.zip].filter(Boolean).join(" ")
}

// ── CSV ────────────────────────────────────────────────────────────────────

function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** Display name for an address type in headers ("Unknown" reads as "Other"). */
const addrPrefix = (t: string) => (t === "Unknown" ? "Other" : t)

export function toCsv(
  contacts: ExportContact[],
  tagLabels: Record<string, string> = {},
  fields: ContactFieldDef[] = [],
): string {
  const emailType = (label: string) => normalizeLabel(label, EMAIL_LABELS)
  const phoneType = (label: string) => normalizeLabel(label, PHONE_LABELS)
  const addrType = (label: string) => normalizeLabel(label, ADDRESS_LABELS)

  // Only include columns for types actually present in this list.
  const emailTypes = EMAIL_LABELS.filter((t) => contacts.some((c) => c.emails.some((e) => emailType(e.label) === t)))
  const phoneTypes = PHONE_LABELS.filter((t) => contacts.some((c) => c.phones.some((p) => phoneType(p.label) === t)))
  const addrTypes = ADDRESS_LABELS.filter((t) => contacts.some((c) => c.addresses.some((a) => addrType(a.label) === t)))
  // One column per custom field that has a value somewhere in this list.
  const customFields = fields.filter((f) => contacts.some((c) => !isEmptyValue(c.customFields[f.id])))

  const header = [
    "First Name", "Last Name", "Tags",
    ...emailTypes.map((t) => `${t} Email`),
    ...phoneTypes.map((t) => `${t} Phone`),
    ...addrTypes.flatMap((t) => {
      const p = addrPrefix(t)
      return [`${p} Street`, `${p} Line 2`, `${p} City`, `${p} State`, `${p} ZIP`]
    }),
    ...customFields.map((f) => f.label),
    "Source", "Date Added",
  ]

  const lines = [header.join(",")]
  for (const c of contacts) {
    const row = [
      c.firstName,
      c.lastName,
      c.types.map((t) => tagLabels[t] ?? t).join("; "),
      // One column per email/phone type — multiple of the same type joined with "; ".
      ...emailTypes.map((t) => c.emails.filter((e) => emailType(e.label) === t).map((e) => e.email).join("; ")),
      ...phoneTypes.map((t) => c.phones.filter((p) => phoneType(p.label) === t).map((p) => p.phone).join("; ")),
      // Each address type's fields (blank when the contact has none of that type).
      ...addrTypes.flatMap((t) => {
        const a = c.addresses.find((x) => addrType(x.label) === t)
        return a ? [a.line1, a.line2 ?? "", a.city ?? "", a.state ?? "", a.zip ?? ""] : ["", "", "", "", ""]
      }),
      ...customFields.map((f) => formatFieldValue(f.type, c.customFields[f.id])),
      SOURCE_LABELS[c.source] ?? c.source,
      c.createdAt.slice(0, 10),
    ]
    lines.push(row.map((v) => csvField(String(v ?? ""))).join(","))
  }
  // BOM so Excel reads UTF-8 correctly.
  return "﻿" + lines.join("\r\n")
}

// ── Email list ───────────────────────────────────────────────────────────────

/** The preferred single email for a contact: Personal → Work → Governmental → first. */
export function preferredEmail(c: ExportContact): string | null {
  for (const t of ["Personal", "Work", "Governmental", "Unknown"]) {
    const e = c.emails.find((x) => normalizeLabel(x.label, EMAIL_LABELS) === t)
    if (e) return e.email
  }
  return c.emails[0]?.email ?? null
}

/** Deduped email entries for a send list — "email" or "Name <email>". */
export function emailListEntries(contacts: ExportContact[], opts: { all: boolean; withName: boolean }): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const add = (email: string, name: string) => {
    const k = email.trim().toLowerCase()
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(opts.withName && name ? `${name} <${email}>` : email)
  }
  for (const c of contacts) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ")
    if (opts.all) c.emails.forEach((e) => add(e.email, name))
    else {
      const e = preferredEmail(c)
      if (e) add(e, name)
    }
  }
  return out
}

// ── Printable HTML ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!)
}

// Avery label-sheet geometry (US Letter). Vertical pitch = label height for each
// (no row gap), and (11in − 2×top) is an exact multiple of the height, so rows
// align across pages.
export const LABEL_FORMATS = [
  { id: "5160", name: "Avery 5160", per: 30, cols: 3, labelW: "2.625in", labelH: "1in", top: "0.5in", side: "0.1875in", colGap: "0.125in" },
  { id: "5161", name: "Avery 5161", per: 20, cols: 2, labelW: "4in", labelH: "1in", top: "0.5in", side: "0.15625in", colGap: "0.1875in" },
  { id: "5162", name: "Avery 5162", per: 14, cols: 2, labelW: "4in", labelH: "1.333in", top: "0.83in", side: "0.15625in", colGap: "0.1875in" },
  { id: "5163", name: "Avery 5163", per: 10, cols: 2, labelW: "4in", labelH: "2in", top: "0.5in", side: "0.15625in", colGap: "0.1875in" },
] as const

export type LabelFormatId = (typeof LABEL_FORMATS)[number]["id"]

/** Mailing labels for the given Avery format. Only contacts with an address. */
export function labelsHtml(contacts: ExportContact[], formatId: LabelFormatId = "5160"): string {
  const f = LABEL_FORMATS.find((x) => x.id === formatId) ?? LABEL_FORMATS[0]
  const withAddr = contacts.map((c) => ({ c, a: mailingAddress(c) })).filter((x): x is { c: ExportContact; a: ExportAddress } => !!x.a)
  const cells = withAddr
    .map(({ c, a }) => {
      const lines = [nameLastFirst(c), a.line1, a.line2 || "", cityStateZip(a)].filter(Boolean)
      return `<div class="label">${lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div>`
    })
    .join("")
  const css = `
    @page { size: letter; margin: ${f.top} ${f.side}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; }
    .grid { display: grid; grid-template-columns: repeat(${f.cols}, ${f.labelW}); column-gap: ${f.colGap}; }
    .label { width: ${f.labelW}; height: ${f.labelH}; padding: 0.06in 0.18in; overflow: hidden; font-size: 11px; line-height: 1.25; display: flex; flex-direction: column; justify-content: center; break-inside: avoid; }
    @media screen { body { background: #f4f6f9; padding: 16px; } .grid { width: max-content; margin: 0 auto; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.12); } }
  `
  return wrapPrint(`Address labels — ${f.name}`, css, `<div class="grid">${cells}</div>`)
}

/** A call sheet: name + formatted phones + a notes column. Only contacts with a
 *  phone. Paginated for Letter (8.5×11) into explicit page blocks, each with the
 *  title + column headers repeated and a "Page X of N" footer. Rows are chunked
 *  by line count so a page never overflows. */
export function phoneListHtml(contacts: ExportContact[]): string {
  const withPhone = contacts.filter((c) => c.phones.length > 0)
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  // Chunk contacts into pages by "line units" (a contact with k phones ≈ k lines);
  // conservative so a Letter page's content never spills past its printable area.
  const PER_PAGE = 26
  const pages: ExportContact[][] = []
  let cur: ExportContact[] = []
  let units = 0
  for (const c of withPhone) {
    const u = Math.max(1, c.phones.length)
    if (cur.length && units + u > PER_PAGE) {
      pages.push(cur)
      cur = []
      units = 0
    }
    cur.push(c)
    units += u
  }
  if (cur.length) pages.push(cur)
  if (pages.length === 0) pages.push([])
  const total = pages.length

  const rowHtml = (c: ExportContact) => {
    const phones = c.phones.map((p) => `${esc(formatPhone(p.phone))} <span class="lbl">(${esc(p.label)})</span>`).join("<br/>")
    return `<tr><td>${esc(nameLastFirst(c))}</td><td>${phones}</td><td></td></tr>`
  }

  const pageHtml = (people: ExportContact[], i: number) => `
    <section class="page">
      <table>
        <thead>
          <tr><th colspan="3" class="title">Phone list <span class="meta">— ${withPhone.length} contacts · ${esc(date)}</span></th></tr>
          <tr><th class="col">Name</th><th class="col">Phone</th><th class="col">Notes</th></tr>
        </thead>
        <tbody>${people.map(rowHtml).join("")}</tbody>
      </table>
      <div class="footer">Page ${i + 1} of ${total}</div>
    </section>`

  const css = `
    @page { size: letter; margin: 0.6in; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; margin: 0; }
    .page { display: flex; flex-direction: column; min-height: 9.2in; }
    .page:not(:last-child) { page-break-after: always; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .title { text-align: left; padding: 0 8px 10px; font-size: 16px; border: 0; }
    .title .meta { font-weight: normal; color: #666; font-size: 12px; }
    th.col { text-align: left; border-bottom: 2px solid #1b3a6b; padding: 6px 8px; font-size: 12px; }
    td { border-bottom: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
    td:nth-child(3) { width: 30%; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .lbl { color: #888; }
    .footer { margin-top: auto; padding-top: 8px; text-align: right; font-size: 10px; color: #888; }
    @media screen {
      body { background: #f4f6f9; padding: 24px; }
      .page { background: #fff; max-width: 7.3in; margin: 0 auto 16px; padding: 0.3in; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
    }
  `
  return wrapPrint("Phone list", css, pages.map(pageHtml).join(""))
}

function wrapPrint(title: string, css: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head>
    <body>${body}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},200);};</script></body></html>`
}
