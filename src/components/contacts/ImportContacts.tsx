"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  Upload,
  Link2,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  FileSpreadsheet,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { parseUpload, parseGoogleSheet, importContacts, type ImportResult } from "@/app/contacts/import/actions"
import {
  FIELD_OPTIONS,
  rowToContact,
  guessCustomField,
  type FieldKey,
  type ParsedSheet,
} from "@/lib/contactsImport"
import { formatPhone } from "@/lib/contacts"
import { type ContactFieldDef } from "@/lib/contactFields"

type FieldOption = { key: FieldKey; label: string; group: string }

type Step = "source" | "map" | "done"

export function ImportContacts({ customFields = [] }: { customFields?: ContactFieldDef[] }) {
  // Mapping options for the <select>, grouped (Name, Email, …) with the committee's
  // custom fields appended as their own group.
  const fieldGroups = useMemo<[string, FieldOption[]][]>(() => {
    const options: FieldOption[] = [
      ...FIELD_OPTIONS,
      ...customFields.map((f) => ({ key: `cf:${f.id}` as FieldKey, label: f.label, group: "Custom fields" })),
    ]
    const m = new Map<string, FieldOption[]>()
    for (const o of options) (m.get(o.group) ?? m.set(o.group, []).get(o.group)!).push(o)
    return [...m.entries()]
  }, [customFields])
  const cfLabel = useMemo(() => new Map(customFields.map((f) => [f.id, f.label])), [customFields])
  const [step, setStep] = useState<Step>("source")
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [fields, setFields] = useState<FieldKey[]>([])
  const [gsUrl, setGsUrl] = useState("")
  const [updateExisting, setUpdateExisting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function onParsed(r: Awaited<ReturnType<typeof parseUpload>>) {
    if (!r.ok) return setError(r.error)
    setSheet(r.sheet)
    // Built-in guess first; fall back to matching a custom field by its name.
    setFields(r.sheet.columns.map((c) => (c.field === "ignore" ? guessCustomField(c.header, customFields) ?? c.field : c.field)))
    setStep("map")
  }

  function handleFile(file: File | null) {
    if (!file) return
    setError(null)
    const fd = new FormData()
    fd.append("file", file)
    startTransition(async () => onParsed(await parseUpload(fd)))
  }

  function handleSheetUrl() {
    if (!gsUrl.trim()) return setError("Paste a Google Sheets link first.")
    setError(null)
    startTransition(async () => onParsed(await parseGoogleSheet(gsUrl.trim())))
  }

  const mapping = useMemo(
    () => (sheet ? sheet.columns.map((c, i) => ({ index: c.index, field: fields[i] })) : []),
    [sheet, fields],
  )
  const hasName = fields.some((f) => f === "firstName" || f === "lastName" || f === "fullName")
  const previews = useMemo(() => {
    if (!sheet) return []
    const out: ReturnType<typeof rowToContact>[] = []
    for (const row of sheet.rows) {
      const d = rowToContact(row, mapping)
      if (d) out.push(d)
      if (out.length >= 5) break
    }
    return out
  }, [sheet, mapping])
  const willImport = useMemo(
    () => (sheet ? sheet.rows.reduce((n, row) => n + (rowToContact(row, mapping) ? 1 : 0), 0) : 0),
    [sheet, mapping],
  )

  function handleImport() {
    if (!sheet) return
    setError(null)
    startTransition(async () => {
      const r = await importContacts({ columns: mapping, rows: sheet.rows, updateExisting })
      if (!r.ok) return setError(r.error)
      setResult(r)
      setStep("done")
    })
  }

  return (
    <div>
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Contacts
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-[#1a1a2e]">Load a contact list</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        Upload an Excel or CSV file, or paste a Google Sheets link. We&rsquo;ll guess what each column means and let
        you confirm before importing.
      </p>

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {step === "source" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Upload */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-[#1a1a2e]">
              <FileSpreadsheet className="h-5 w-5 text-[#1b3a6b]" />
              <span className="font-semibold">Upload a file</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Excel (.xlsx, .xls) or CSV. First row should be headers.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-sm font-medium text-[#1b3a6b] transition-colors hover:bg-muted">
              <Upload className="h-4 w-4" />
              {isPending ? "Reading…" : "Choose file"}
              <input
                type="file"
                accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                disabled={isPending}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Google Sheets */}
          <div className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center gap-2 text-[#1a1a2e]">
              <Link2 className="h-5 w-5 text-[#1b3a6b]" />
              <span className="font-semibold">Google Sheets link</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Share the sheet as <span className="font-medium text-[#1a1a2e]">Anyone with the link → Viewer</span>,
              then paste it here.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={gsUrl}
                onChange={(e) => setGsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/…"
                className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
              />
              <Button onClick={handleSheetUrl} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === "map" && sheet && (
        <div className="mt-6">
          <div className="rounded-2xl border border-border bg-white">
            <div className="border-b border-border px-5 py-3">
              <h2 className="font-semibold text-[#1a1a2e]">Confirm the columns</h2>
              <p className="text-sm text-muted-foreground">
                We guessed the meaning of each column — adjust any that are wrong. Set columns you don&rsquo;t need to{" "}
                <span className="font-medium">Ignore</span>.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-semibold">Column</th>
                    <th className="px-5 py-2.5 font-semibold">Sample values</th>
                    <th className="px-5 py-2.5 font-semibold">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.columns.map((col, i) => (
                    <tr key={col.index} className="border-b border-border/60 last:border-0">
                      <td className="px-5 py-2.5 align-top font-medium text-[#1a1a2e]">{col.header}</td>
                      <td className="px-5 py-2.5 align-top text-muted-foreground">
                        {col.samples.length ? col.samples.join(", ") : <span className="text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-5 py-2.5 align-top">
                        <select
                          value={fields[i]}
                          onChange={(e) =>
                            setFields((prev) => prev.map((f, j) => (j === i ? (e.target.value as FieldKey) : f)))
                          }
                          className="rounded-md border border-border bg-white px-2 py-1 text-sm text-[#1a1a2e] outline-none focus:border-[#1b3a6b]"
                        >
                          {fieldGroups.map(([group, opts]) => (
                            <optgroup key={group} label={group}>
                              {opts.map((o) => (
                                <option key={o.key} value={o.key}>
                                  {o.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a2e]">Preview</h3>
              <span className="text-sm text-muted-foreground">
                {willImport} of {sheet.rowCount} rows ready
              </span>
            </div>
            {!hasName ? (
              <p className="mt-3 text-sm text-[#8a5a00]">Map a column to First name, Last name, or Full name to continue.</p>
            ) : previews.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No rows produced a contact — check the mapping.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/60">
                {previews.map((d, i) =>
                  d ? (
                    <li key={i} className="flex flex-wrap gap-x-6 gap-y-0.5 py-2 text-sm">
                      <span className="font-medium text-[#1a1a2e]">
                        {[d.lastName, d.firstName].filter(Boolean).join(", ") || "—"}
                      </span>
                      {d.emails[0] && <span className="text-muted-foreground">{d.emails[0].value}</span>}
                      {d.phones[0] && <span className="text-muted-foreground">{formatPhone(d.phones[0].value)}</span>}
                      {d.addresses.map((a, ai) => (
                        <span key={ai} className="text-muted-foreground">
                          {a.label}: {[a.line1, a.city, a.state].filter(Boolean).join(", ")}
                        </span>
                      ))}
                      {d.tags.length > 0 && <span className="text-muted-foreground/80">{d.tags.join(", ")}</span>}
                      {Object.entries(d.customFields).map(([id, v]) => (
                        <span key={id} className="text-muted-foreground/80">
                          {cfLabel.get(id) ?? "Field"}: {v}
                        </span>
                      ))}
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </div>

          {/* Options */}
          <div className="mt-4 rounded-2xl border border-border bg-white p-5">
            <label className="flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={updateExisting}
                onChange={(e) => setUpdateExisting(e.target.checked)}
                className="mt-0.5 accent-[#1b3a6b]"
              />
              <span>
                <span className="font-medium text-[#1a1a2e]">Update contacts already on the list</span>
                <span className="block text-muted-foreground">
                  Add new emails, phones, and addresses to people who match by name, instead of skipping them — ideal
                  for filling in a list you already imported.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => {
                setStep("source")
                setSheet(null)
                setError(null)
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
            >
              <ArrowLeft className="h-4 w-4" />
              Choose a different file
            </button>
            <Button onClick={handleImport} disabled={isPending || !hasName || willImport === 0}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  Import {willImport} {willImport === 1 ? "contact" : "contacts"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && result.ok && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e6b3a]/10 text-[#1e6b3a]">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[#1a1a2e]">
            {result.created} added
            {result.updated > 0 ? `, ${result.updated} updated` : ""}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              `${result.created} new ${result.created === 1 ? "contact" : "contacts"}`,
              result.updated > 0 ? `${result.updated} existing updated` : null,
              result.skipped > 0 ? `${result.skipped} unchanged (already complete)` : null,
            ]
              .filter(Boolean)
              .join(" · ")}{" "}
            — {result.total} {result.total === 1 ? "person" : "people"} in the file.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/contacts"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16305a]"
            >
              <Users className="h-4 w-4" />
              View contacts
            </Link>
            <button
              onClick={() => {
                setStep("source")
                setSheet(null)
                setResult(null)
                setGsUrl("")
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-muted"
            >
              Load another list
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
