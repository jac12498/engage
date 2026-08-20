"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  submitCommittee,
  lookupCommittee,
  lookupFecCommittee,
  searchCommittees,
  type CommitteeSearchMatch,
} from "@/app/onboarding/actions"
import {
  SUPPORTED_STATES,
  JURISDICTIONS,
  committeeTypesFor,
  committeeTypeLabel,
  isSupportedState,
  normalizeFecCommitteeId,
  type Jurisdiction,
} from "@/lib/committeeTypes"

// All US states for the dropdown; only SUPPORTED_STATES are selectable, the rest
// render disabled ("coming soon") so users see the roadmap without being blocked
// into thinking the product is NY-only forever.
const ALL_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }))

export interface CommitteeFormInput {
  jurisdiction: Jurisdiction
  state: string
  committeeType: string
  name: string
  filerId?: string
}

// A committee-form submit action: creates the committee and (on success) redirects,
// or returns an error. Used for both first-time onboarding and creating additional
// committees.
type SubmitAction = (
  input: CommitteeFormInput
) => Promise<{ ok: true } | { ok: false; error: string } | void>

export function CommitteeOnboardingForm({
  submitAction = submitCommittee,
  submitLabel = "Create committee",
  pendingLabel = "Creating your committee…",
  initial,
  savedLabel,
}: {
  submitAction?: SubmitAction
  submitLabel?: string
  pendingLabel?: string
  /** Pre-fill the form for editing an existing committee. */
  initial?: Partial<CommitteeFormInput>
  /** When set, a success confirmation shown after a submit that returns { ok: true }. */
  savedLabel?: string
} = {}) {
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(initial?.jurisdiction ?? "state")
  // Default to NY (the only supported state today) so the type list is ready.
  const [state, setState] = useState(initial?.state || SUPPORTED_STATES[0]?.code || "NY")
  const [committeeType, setCommitteeType] = useState(initial?.committeeType ?? "")
  const [name, setName] = useState(initial?.name ?? "")
  const [filerId, setFilerId] = useState(initial?.filerId ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Filer-ID lookup state (shared by the state + federal lookups).
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)
  const [matched, setMatched] = useState<{ name: string; typeLabel: string | null; location: string | null } | null>(null)

  // Search-by-name state (state committees).
  const [searchQuery, setSearchQuery] = useState(initial?.name ?? "")
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CommitteeSearchMatch[] | null>(null)

  const types = useMemo(() => committeeTypesFor(state), [state])
  const stateSupported = isSupportedState(state)
  const selectedType = types.find((t) => t.code === committeeType)
  const isFederal = jurisdiction === "federal"

  function resetLookup() {
    setMatched(null)
    setLookupMsg(null)
  }

  async function handleSearch() {
    setError(null)
    resetLookup()
    const q = searchQuery.trim()
    if (q.length < 3) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      setSearchResults(await searchCommittees(state, q))
    } finally {
      setSearching(false)
    }
  }

  function selectMatch(m: CommitteeSearchMatch) {
    setName(m.name)
    if (m.committeeTypeCode) setCommitteeType(m.committeeTypeCode)
    setFilerId(m.filerId)
    setMatched({
      name: m.name,
      typeLabel: committeeTypeLabel(state, m.committeeTypeCode) ?? m.rawCommitteeType,
      location: m.location,
    })
    setSearchResults(null)
  }

  async function handleStateLookup() {
    setError(null)
    resetLookup()
    const id = filerId.trim()
    if (!id) return setLookupMsg("Enter a Filer ID to look up.")
    setLookingUp(true)
    try {
      const res = await lookupCommittee(state, id)
      if (!res.found) {
        setLookupMsg("No committee found for that Filer ID — enter your details manually.")
        return
      }
      setName(res.name)
      if (res.committeeTypeCode) setCommitteeType(res.committeeTypeCode)
      const location = [res.city, res.addressState].filter(Boolean).join(", ") || null
      setMatched({
        name: res.name,
        typeLabel: committeeTypeLabel(state, res.committeeTypeCode) ?? res.rawCommitteeType,
        location,
      })
    } finally {
      setLookingUp(false)
    }
  }

  async function handleFederalLookup() {
    setError(null)
    resetLookup()
    const id = normalizeFecCommitteeId(filerId)
    if (!id) return setLookupMsg("Enter a valid FEC committee ID (C followed by 8 digits).")
    setLookingUp(true)
    try {
      const res = await lookupFecCommittee(id)
      if (!res.found) {
        setLookupMsg("No committee found for that FEC ID — enter your details manually.")
        return
      }
      if (res.name) setName(res.name)
      setMatched({ name: res.name || "FEC committee", typeLabel: res.party, location: res.state })
    } finally {
      setLookingUp(false)
    }
  }

  function handleSubmit() {
    setError(null)
    setSaved(false)
    if (!name.trim()) return setError("Please enter your committee name.")
    if (isFederal) {
      if (!normalizeFecCommitteeId(filerId)) {
        return setError("Enter a valid FEC committee ID (the letter C followed by 8 digits).")
      }
    } else {
      if (!stateSupported) return setError("We don't support that state yet — choose New York for now.")
      if (!committeeType) return setError("Please choose a committee type.")
    }

    startTransition(async () => {
      const result = await submitAction({
        jurisdiction,
        state,
        committeeType,
        name,
        filerId: filerId.trim() || undefined,
      })
      if (result && !result.ok) setError(result.error)
      else if (result?.ok) setSaved(true)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Committee</h2>

        {/* Jurisdiction — state vs federal registration */}
        <div className="mt-4">
          <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
            Registration<span className="ml-0.5 text-red-500">*</span>
          </span>
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {JURISDICTIONS.map((j) => (
              <button
                key={j.code}
                type="button"
                onClick={() => {
                  setJurisdiction(j.code)
                  setCommitteeType("")
                  resetLookup()
                }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                  jurisdiction === j.code ? "bg-[#1b3a6b] text-white" : "text-[#1a1a2e] hover:bg-muted"
                }`}
              >
                {j.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {JURISDICTIONS.find((j) => j.code === jurisdiction)?.description}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {!isFederal && (
            <>
              {/* State */}
              <Field label="State" required>
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value)
                    setCommitteeType("") // types depend on state
                  }}
                  className={selectCls}
                >
                  {ALL_STATES.map((s) => {
                    const supported = isSupportedState(s.code)
                    return (
                      <option key={s.code} value={s.code} disabled={!supported}>
                        {s.name}
                        {supported ? "" : " (coming soon)"}
                      </option>
                    )
                  })}
                </select>
              </Field>

              {/* Committee type */}
              <Field label="Committee type" required>
                <select
                  value={committeeType}
                  onChange={(e) => setCommitteeType(e.target.value)}
                  disabled={!stateSupported}
                  className={selectCls}
                >
                  <option value="">Select type…</option>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Type description */}
              {selectedType && (
                <p className="sm:col-span-2 -mt-1 text-xs text-muted-foreground">
                  {selectedType.description}
                </p>
              )}

              {/* Search the registry by name — for people who don't know their Filer ID */}
              <div className="sm:col-span-2 rounded-xl border border-border bg-muted/30 p-3.5">
                <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
                  Don&rsquo;t know your Filer ID? Search by name
                </span>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleSearch()
                        }
                      }}
                      placeholder="Committee name"
                      className={`${inputCls} pl-9`}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearch}
                    disabled={!stateSupported || searching || searchQuery.trim().length < 3}
                  >
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                {searchResults !== null && (
                  <div className="mt-2.5">
                    {searchResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No committees matched. Try fewer words, or enter your details manually below.
                      </p>
                    ) : (
                      <ul className="max-h-60 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-white">
                        {searchResults.map((m) => (
                          <li key={m.filerId}>
                            <button
                              type="button"
                              onClick={() => selectMatch(m)}
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
                                <span className="text-xs font-mono text-muted-foreground">{m.filerId}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Name */}
          <div className="sm:col-span-2">
            <Field label="Committee name" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isFederal ? "Friends of Jane for Congress" : "Woodstock Democratic Committee"}
                className={inputCls}
              />
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The name of your committee or organization, as registered (or as you intend to
              register it).
            </p>
          </div>

          {/* Filer ID + lookup — state BOE id (state) or FEC committee id (federal) */}
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              {isFederal ? "FEC Committee ID" : "NY State Filer ID (optional)"}
              {isFederal && <span className="ml-0.5 text-red-500">*</span>}
            </span>
            <div className="flex gap-2">
              <input
                value={filerId}
                onChange={(e) => {
                  setFilerId(e.target.value)
                  resetLookup()
                }}
                placeholder={isFederal ? "e.g. C00123456" : "e.g. A12345"}
                className={`${inputCls} flex-1`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={isFederal ? handleFederalLookup : handleStateLookup}
                disabled={(!isFederal && !stateSupported) || lookingUp || !filerId.trim()}
              >
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isFederal
                ? "Your committee’s FEC ID (the letter C followed by 8 digits). Click Look up to fill in your details from the FEC registry."
                : "If your committee is registered with the NY State Board of Elections, enter its Filer ID and click Look up to fill in your details automatically. You can edit anything after."}
            </p>
            {lookupMsg && <p className="mt-1.5 text-xs text-[#c4910a]">{lookupMsg}</p>}
            {matched && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-green-600/30 bg-green-50 px-3.5 py-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                <div className="text-sm text-green-900">
                  <span className="font-semibold">{matched.name}</span>
                  {matched.typeLabel && <> · {matched.typeLabel}</>}
                  {matched.location && (
                    <span className="text-green-800/70"> · {matched.location}</span>
                  )}
                  <p className="mt-0.5 text-xs text-green-800/80">
                    Filled in from the {isFederal ? "FEC" : "NY Board of Elections"} registry. Edit anything
                    below if needed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && savedLabel && !isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <CheckCircle2 className="h-4 w-4" />
            {savedLabel}
          </span>
        )}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

const selectCls = inputCls

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}
