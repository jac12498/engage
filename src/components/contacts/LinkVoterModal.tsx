"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { X, Search, Loader2, Check } from "lucide-react"
import { searchVotersForContact, linkVoter } from "@/app/contacts/voter-actions"
import type { VoterCandidate } from "@/lib/voters"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function LinkVoterModal({
  contactId,
  defaultName,
  defaultCity,
  defaultZip,
  onClose,
}: {
  contactId: string
  defaultName: string
  defaultCity?: string
  defaultZip?: string
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(defaultName)
  const [city, setCity] = useState(defaultCity ?? "")
  const [zip, setZip] = useState(defaultZip ?? "")
  const [results, setResults] = useState<VoterCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [linking, start] = useTransition()

  useEffect(() => {
    if (name.trim().split(/\s+/).filter(Boolean).length < 1) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(async () => {
      const res = await searchVotersForContact(contactId, { name, city, zip })
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
  }, [name, city, zip, contactId])

  function link() {
    if (!selected) return
    setError(null)
    start(async () => {
      const res = await linkVoter(contactId, selected)
      if (!res.ok) return setError(res.error)
      onClose()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-border bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a2e]">Find voter record</h2>
            <p className="text-sm text-muted-foreground">Search the NY voter file and link the right person.</p>
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
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" className={inputCls} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-medium text-muted-foreground">ZIP</span>
            <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="Optional" className={inputCls} />
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
              <Search className="mx-auto mb-1 h-4 w-4" />
              No matching voters. Try broadening the name or clearing city/ZIP.
            </p>
          )}
          {!searching &&
            results.map((v) => {
              const isSel = selected === v.stateVoterId
              return (
                <button
                  key={v.stateVoterId}
                  onClick={() => setSelected(v.stateVoterId)}
                  className={`flex w-full items-start justify-between gap-3 border-b border-border px-6 py-3 text-left transition-colors last:border-0 ${
                    isSel ? "bg-[#1b3a6b]/[0.06]" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[#1a1a2e]">
                      {[v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[v.address, [v.city, v.zip].filter(Boolean).join(" ")].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[v.partyLabel, v.countyLabel, v.statusLabel].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {isSel && <Check className="mt-1 h-4 w-4 shrink-0 text-[#1b3a6b]" />}
                </button>
              )
            })}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-[#1a1a2e] hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={link}
            disabled={!selected || linking}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#122850] disabled:opacity-50"
          >
            {linking && <Loader2 className="h-4 w-4 animate-spin" />}
            Link this voter
          </button>
        </div>
      </div>
    </div>
  )
}
