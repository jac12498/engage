"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react"
import { importDonors } from "@/app/contacts/import-donors/actions"

export interface ImportDonorRow {
  key: string
  name: string
  location: string | null
  totalAmount: number
  count: number
  lastDate: string | null
  alreadyContact: boolean
}

function money(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

export function ImportDonorsTable({ rows, sourceKey }: { rows: ImportDonorRow[]; sourceKey: string }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()
  const [done, setDone] = useState<{ created: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only not-yet-imported donors are selectable.
  const selectable = useMemo(() => rows.filter((r) => !r.alreadyContact), [rows])
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.key))

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.key)))
  }

  function submit() {
    if (selected.size === 0) return
    setError(null)
    start(async () => {
      const res = await importDonors(sourceKey, [...selected])
      if (!res.ok) return setError(res.error)
      setDone({ created: res.created, skipped: res.skipped })
      setSelected(new Set())
      router.refresh()
    })
  }

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-muted-foreground">
          No individual contributions to your committee were found in the disclosure data.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      {done && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
          <p className="text-sm text-green-900">
            Added {done.created} {done.created === 1 ? "contact" : "contacts"}.
            {done.skipped > 0 && <> {done.skipped} already in your list were skipped.</>}
          </p>
        </div>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? "donor" : "donors"} ·{" "}
          {selectable.length} available to add
        </p>
        <button
          onClick={submit}
          disabled={pending || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850] disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Add {selected.size > 0 ? `${selected.size} ` : ""}as {selected.size === 1 ? "contact" : "contacts"}
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectable.length === 0}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 font-medium">Donor</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 text-right font-medium">Total given</th>
              <th className="px-4 py-3 text-right font-medium">Gifts</th>
              <th className="px-4 py-3 font-medium">Last gift</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const checked = selected.has(r.key)
              return (
                <tr
                  key={r.key}
                  className={`border-b border-border last:border-0 ${r.alreadyContact ? "opacity-60" : "hover:bg-muted/40"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={r.alreadyContact}
                      onChange={() => toggle(r.key)}
                      aria-label={`Select ${r.name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#1a1a2e]">{r.name}</span>
                    {r.alreadyContact && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Already a contact
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.location ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-[#1a1a2e]">{money(r.totalAmount)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{r.count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.lastDate ?? "—"}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
