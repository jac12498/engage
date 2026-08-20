"use client"

import { useState } from "react"
import { Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { searchCommittees, type CommitteeSearchMatch } from "@/app/onboarding/actions"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

/**
 * Search a state's committee registry by name and pick a match. Shared by committee
 * onboarding-style flows and the Add Candidate form (finding the candidate's own
 * committee). The caller decides what to do with the selection via `onSelect`.
 */
export function CommitteeRegistrySearch({
  state,
  onSelect,
  defaultQuery = "",
  placeholder = "Committee name",
}: {
  state: string
  onSelect: (match: CommitteeSearchMatch) => void
  defaultQuery?: string
  placeholder?: string
}) {
  const [query, setQuery] = useState(defaultQuery)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<CommitteeSearchMatch[] | null>(null)

  async function handleSearch() {
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      setResults(await searchCommittees(state, q))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                handleSearch()
              }
            }}
            placeholder={placeholder}
            className={`${inputCls} pl-9`}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleSearch}
          disabled={searching || query.trim().length < 3}
        >
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>

      {results !== null && (
        <div className="mt-2.5">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No committees matched. Try fewer words, or enter the name manually.
            </p>
          ) : (
            <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white">
              {results.map((m) => (
                <li key={m.filerId}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(m)
                      setResults(null)
                    }}
                    className="flex w-full items-start justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#1a1a2e]">{m.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[m.rawCommitteeType, m.location].filter(Boolean).join(" · ") || `Filer ${m.filerId}`}
                      </span>
                    </span>
                    <span className="mt-0.5 flex shrink-0 items-center gap-2">
                      {m.status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.status.toUpperCase() === "ACTIVE"
                              ? "bg-[#1e6b3a]/10 text-[#1e6b3a]"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.status}
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground">{m.filerId}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
