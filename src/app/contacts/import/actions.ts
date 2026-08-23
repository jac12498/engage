"use server"

import { revalidatePath } from "next/cache"
import * as XLSX from "xlsx"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { canonicalizeEmail } from "@/lib/emailNormalize"
import {
  guessField,
  rowToContact,
  nameKey,
  type ParsedSheet,
  type FieldKey,
  type ImportContactDraft,
} from "@/lib/contactsImport"

const MAX_ROWS = 5000
const MAX_COLS = 60

export type ParseResult = { ok: true; sheet: ParsedSheet } | { ok: false; error: string }
export type ImportResult =
  | { ok: true; created: number; updated: number; skipped: number; total: number }
  | { ok: false; error: string }

/** Turn a parsed workbook's first sheet into columns + rows + guessed mapping. */
function buildParsedSheet(wb: XLSX.WorkBook): ParseResult {
  const first = wb.SheetNames[0]
  if (!first) return { ok: false, error: "That file has no sheets." }
  const ws = wb.Sheets[first]
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" })
  if (aoa.length === 0) return { ok: false, error: "That sheet is empty." }

  const headerRow = (aoa[0] ?? []).slice(0, MAX_COLS).map((c) => String(c ?? "").trim())
  if (headerRow.every((h) => !h)) return { ok: false, error: "Couldn't find a header row (the first row should name the columns)." }

  const dataRows = aoa.slice(1, 1 + MAX_ROWS).map((r) =>
    headerRow.map((_, i) => String((r as unknown[])[i] ?? "").trim()),
  )

  const columns = headerRow.map((header, index) => {
    const samples: string[] = []
    for (const r of dataRows) {
      if (r[index]) samples.push(r[index])
      if (samples.length >= 3) break
    }
    return { index, header: header || `Column ${index + 1}`, samples, field: guessField(header) }
  })

  return { ok: true, sheet: { columns, rows: dataRows, rowCount: dataRows.length } }
}

/** Parse an uploaded .xlsx / .xls / .csv file. */
export async function parseUpload(formData: FormData): Promise<ParseResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:create")) {
    return { ok: false, error: "You don't have permission to add contacts." }
  }
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Please choose a file." }
  if (file.size > 15 * 1024 * 1024) return { ok: false, error: "That file is too large (max 15 MB)." }
  try {
    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: "buffer" })
    return buildParsedSheet(wb)
  } catch {
    return { ok: false, error: "Couldn't read that file — is it a valid Excel or CSV file?" }
  }
}

/** Fetch + parse a shared Google Sheet by its link (via its public CSV export). */
export async function parseGoogleSheet(url: string): Promise<ParseResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:create")) {
    return { ok: false, error: "You don't have permission to add contacts." }
  }
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) return { ok: false, error: "That doesn't look like a Google Sheets link." }
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/)
  const exportUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv${
    gidMatch ? `&gid=${gidMatch[1]}` : ""
  }`
  try {
    const res = await fetch(exportUrl, { redirect: "follow" })
    const text = await res.text()
    // A private sheet returns Google's HTML sign-in page instead of CSV.
    if (!res.ok || /^\s*<(?:!doctype|html)/i.test(text)) {
      return {
        ok: false,
        error: "Couldn't read that sheet. Share it as “Anyone with the link → Viewer”, then try again.",
      }
    }
    const wb = XLSX.read(text, { type: "string" })
    return buildParsedSheet(wb)
  } catch {
    return { ok: false, error: "Couldn't fetch that Google Sheet. Check the link and its sharing settings." }
  }
}

type AddressDraft = ImportContactDraft["addresses"][number]
interface MergedContact {
  firstName: string
  lastName: string
  emails: { label: string; value: string }[]
  phones: { label: string; value: string }[]
  addresses: AddressDraft[]
  tags: string[]
  seenE: Set<string>
  seenP: Set<string>
  seenA: Set<string>
}

const digits10 = (p: string) => {
  const d = p.replace(/\D/g, "")
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d
}
const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
const addrKey = (a: { line1: string; zip: string; city: string }) => `${alnum(a.line1)}|${alnum(a.zip || a.city)}`

/**
 * Import contacts from confirmed rows + mapping. Rows are first merged by name
 * (so several rows for one person combine). New people are created; when
 * `updateExisting` is set, people already on the list get their NEW emails,
 * phones, addresses, and tags appended (deduped) — this is how a re-import
 * "fills in" additional methods rather than skipping the person.
 */
export async function importContacts(payload: {
  columns: { index: number; field: FieldKey }[]
  rows: string[][]
  updateExisting?: boolean
}): Promise<ImportResult> {
  const ctx = await getActiveContext()
  if (!ctx || !ctx.permissions.has("contacts:create")) {
    return { ok: false, error: "You don't have permission to add contacts." }
  }
  const committeeId = ctx.committee.id
  const { columns, rows } = payload
  const updateExisting = !!payload.updateExisting
  if (rows.length === 0) return { ok: false, error: "Nothing to import." }
  if (updateExisting && !ctx.permissions.has("contacts:update")) {
    return { ok: false, error: "You don't have permission to update existing contacts." }
  }

  const hasName = columns.some((c) => c.field === "firstName" || c.field === "lastName" || c.field === "fullName")
  if (!hasName) return { ok: false, error: "Map at least one column to a name before importing." }

  // 1. Merge rows into one draft per person (union emails/phones/addresses/tags).
  const merged = new Map<string, MergedContact>()
  for (const row of rows) {
    const d = rowToContact(row, columns)
    if (!d) continue
    const key = nameKey(d.firstName, d.lastName)
    let m = merged.get(key)
    if (!m) {
      m = { firstName: d.firstName, lastName: d.lastName, emails: [], phones: [], addresses: [], tags: [], seenE: new Set(), seenP: new Set(), seenA: new Set() }
      merged.set(key, m)
    }
    if (!m.firstName && d.firstName) m.firstName = d.firstName
    if (!m.lastName && d.lastName) m.lastName = d.lastName
    for (const e of d.emails) {
      const k = e.value.toLowerCase()
      if (!m.seenE.has(k)) { m.seenE.add(k); m.emails.push(e) }
    }
    for (const p of d.phones) {
      const k = digits10(p.value) || p.value.toLowerCase()
      if (!m.seenP.has(k)) { m.seenP.add(k); m.phones.push(p) }
    }
    for (const a of d.addresses) {
      const ak = addrKey(a)
      if (!m.seenA.has(ak)) { m.seenA.add(ak); m.addresses.push(a) }
    }
    for (const t of d.tags) if (!m.tags.includes(t)) m.tags.push(t)
  }
  const total = merged.size
  if (total === 0) return { ok: false, error: "No rows produced a contact — check the column mapping." }

  // 2. Index existing contacts by name (with their methods, for de-duped appends).
  const dbRows = await prisma.contact.findMany({
    where: { committeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      types: true,
      emails: { select: { email: true } },
      phones: { select: { phone: true } },
      addresses: { select: { line1: true, zip: true, city: true } },
    },
  })
  const index = new Map<
    string,
    { id: string; emails: Set<string>; phones: Set<string>; addrs: Set<string>; types: Set<string>; emailCount: number; phoneCount: number }
  >()
  for (const c of dbRows) {
    const key = nameKey(c.firstName, c.lastName)
    if (index.has(key)) continue
    index.set(key, {
      id: c.id,
      emails: new Set(c.emails.map((e) => canonicalizeEmail(e.email)).filter(Boolean)),
      phones: new Set(c.phones.map((p) => digits10(p.phone)).filter(Boolean)),
      addrs: new Set(c.addresses.map((a) => addrKey({ line1: a.line1, zip: a.zip ?? "", city: a.city ?? "" }))),
      types: new Set(c.types),
      emailCount: c.emails.length,
      phoneCount: c.phones.length,
    })
  }

  // 3. Create new people; append to existing when updating.
  let created = 0
  let updated = 0
  let skipped = 0
  const toCreate: MergedContact[] = []

  for (const m of merged.values()) {
    const ex = index.get(nameKey(m.firstName, m.lastName))
    if (!ex) {
      toCreate.push(m)
      continue
    }
    if (!updateExisting) {
      skipped++
      continue
    }
    const newEmails = m.emails.filter((e) => { const k = canonicalizeEmail(e.value); return !!k && !ex.emails.has(k) })
    const newPhones = m.phones.filter((p) => { const k = digits10(p.value); return !!k && !ex.phones.has(k) })
    const newAddresses = m.addresses.filter((a) => !ex.addrs.has(addrKey(a)))
    const newTags = m.tags.filter((t) => !ex.types.has(t))
    if (newEmails.length === 0 && newPhones.length === 0 && newAddresses.length === 0 && newTags.length === 0) {
      skipped++
      continue
    }
    await prisma.contact.update({
      where: { id: ex.id },
      data: {
        emails: newEmails.length ? { create: newEmails.map((e, i) => ({ label: e.label, email: e.value, order: ex.emailCount + i })) } : undefined,
        phones: newPhones.length ? { create: newPhones.map((p, i) => ({ label: p.label, phone: p.value, order: ex.phoneCount + i })) } : undefined,
        addresses: newAddresses.length
          ? { create: newAddresses.map((a, i) => ({ label: a.label, line1: a.line1, line2: a.line2 || null, city: a.city || null, state: a.state || null, zip: a.zip || null, order: i })) }
          : undefined,
        types: newTags.length ? [...ex.types, ...newTags] : undefined,
      },
    })
    updated++
  }

  const BATCH = 25
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH)
    await Promise.all(
      slice.map((m) =>
        prisma.contact.create({
          data: {
            committeeId,
            source: "import",
            firstName: m.firstName,
            lastName: m.lastName,
            types: m.tags,
            emails: { create: m.emails.map((e, order) => ({ label: e.label, email: e.value, order })) },
            phones: { create: m.phones.map((p, order) => ({ label: p.label, phone: p.value, order })) },
            addresses: m.addresses.length
              ? { create: m.addresses.map((a, order) => ({ label: a.label, line1: a.line1, line2: a.line2 || null, city: a.city || null, state: a.state || null, zip: a.zip || null, order })) }
              : undefined,
          },
        }),
      ),
    )
    created += slice.length
  }

  revalidatePath("/contacts")
  return { ok: true, created, updated, skipped, total }
}
