"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, Loader2, Check, Plus } from "lucide-react"
import { searchDonationsForContact, addDonation } from "@/app/contacts/donor-actions"
import type { DonationCandidate } from "@/lib/donations"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

const SOURCE = {
  ny: { label: "NY State", cls: "bg-[#1b3a6b]/8 text-[#1b3a6b]" },
  fec: { label: "Federal", cls: "bg-[#6b1b5a]/10 text-[#6b1b5a]" },
} as const

function money(n: number | null): string {
  if (n == null) return "—"
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}

export function FindDonationsModal({
  contactId,
  defaultName,
  defaultCity,
  defaultState,
  defaultZip,
  existingKeys,
  onClose,
}: {
  contactId: string
  defaultName: string
  defaultCity?: string
  defaultState?: string
  defaultZip?: string
  existingKeys: Set<string>
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [city, setCity] = useState(defaultCity ?? "")
  const [state, setState] = useState(defaultState ?? "")
  const [zip, setZip] = useState(defaultZip ?? "")
  const [results, setResults] = useState<DonationCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set(existingKeys))
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    if (name.trim().split(/\s+/).filter(Boolean).length < 1) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const res = await searchDonationsForContact(contactId, { name, city, state, zip })
      if (res.ok) {
        setResults(res.candidates)
        setError(null)
      } else {
        setResults([])
        setError(res.error)
      }
      setSearching(false)
    }, 400)
    return () => clearTimeout(t)
  }, [name, city, state, zip, contactId])

  function add(d: DonationCandidate) {
    const key = `${d.source}:${d.refKey}`
    setBusyKey(key)
    start(async () => {
      const res = await addDonation(contactId, d)
      setBusyKey(null)
      if (!res.ok) return setError(res.error)
      setAdded((prev) => new Set(prev).add(key))
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">Find donations</h2>
            <p className="text-sm text-muted-foreground">Search NY state + federal contributions and add the ones that match.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-6 py-4 sm:grid-cols-4">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First Last" className={inputCls} autoFocus />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">City</span>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional (NY)" className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">State / ZIP</span>
            <div className="flex gap-2">
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="ST" maxLength={2} className={`${inputCls} w-16`} />
              <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" className={inputCls} />
            </div>
          </label>
        </div>

        {error && <p className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="max-h-[45vh] overflow-y-auto border-t border-border">
          {searching && (
            <p className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          )}
          {!searching && results.length === 0 && (
            <p className="px-6 py-6 text-center text-sm text-muted-foreground">
              No matching contributions. Try broadening the name or clearing the filters.
            </p>
          )}
          {!searching &&
            results.map((d) => {
              const key = `${d.source}:${d.refKey}`
              const isAdded = added.has(key)
              return (
                <div key={key} className="flex items-start justify-between gap-3 border-b border-border px-6 py-3 last:border-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[#1a1a2e]">{money(d.amount)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SOURCE[d.source].cls}`}>
                        {SOURCE[d.source].label}
                        {d.cycle ? ` ${d.cycle}` : ""}
                      </span>
                      {d.donationDate && <span className="text-xs text-muted-foreground">{d.donationDate}</span>}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[#1a1a2e]">{d.recipient ?? "Unknown recipient"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[d.donorName, [d.city, d.state].filter(Boolean).join(", "), d.employer].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {isAdded ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#1e6b3a]">
                      <Check className="h-3.5 w-3.5" /> Added
                    </span>
                  ) : (
                    <button
                      onClick={() => add(d)}
                      disabled={busyKey === key}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-[#1b3a6b] transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {busyKey === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Add
                    </button>
                  )}
                </div>
              )
            })}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850]">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
