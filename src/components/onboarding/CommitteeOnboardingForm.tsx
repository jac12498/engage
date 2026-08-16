"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { submitCommittee, lookupCommittee } from "@/app/onboarding/actions"
import {
  SUPPORTED_STATES,
  committeeTypesFor,
  committeeTypeLabel,
  isSupportedState,
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

export function CommitteeOnboardingForm() {
  // Default to NY (the only supported state today) so the type list is ready.
  const [state, setState] = useState(SUPPORTED_STATES[0]?.code ?? "NY")
  const [committeeType, setCommitteeType] = useState("")
  const [name, setName] = useState("")
  const [filerId, setFilerId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filer-ID lookup state.
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupMsg, setLookupMsg] = useState<string | null>(null)
  const [matched, setMatched] = useState<{ name: string; typeLabel: string | null; location: string | null } | null>(null)

  const types = useMemo(() => committeeTypesFor(state), [state])
  const stateSupported = isSupportedState(state)
  const selectedType = types.find((t) => t.code === committeeType)

  async function handleLookup() {
    setError(null)
    setLookupMsg(null)
    setMatched(null)
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

  function handleSubmit() {
    setError(null)
    if (!stateSupported) return setError("We don't support that state yet — choose New York for now.")
    if (!committeeType) return setError("Please choose a committee type.")
    if (!name.trim()) return setError("Please enter your committee name.")

    startTransition(async () => {
      const result = await submitCommittee({
        state,
        committeeType,
        name,
        filerId: filerId.trim() || undefined,
      })
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Committee</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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

          {/* Name */}
          <div className="sm:col-span-2">
            <Field label="Committee name" required>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Woodstock Democratic Committee"
                className={inputCls}
              />
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground">
              The name of your committee or organization, as registered (or as you intend to
              register it).
            </p>
          </div>

          {/* Filer ID (optional) + lookup */}
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              NY State Filer ID (optional)
            </span>
            <div className="flex gap-2">
              <input
                value={filerId}
                onChange={(e) => {
                  setFilerId(e.target.value)
                  setMatched(null)
                  setLookupMsg(null)
                }}
                placeholder="e.g. A12345"
                className={`${inputCls} flex-1`}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleLookup}
                disabled={!stateSupported || lookingUp || !filerId.trim()}
              >
                {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              If your committee is registered with the NY State Board of Elections, enter its Filer ID
              and click Look up to fill in your details automatically. You can edit anything after.
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
                    Filled in from the NY Board of Elections registry. Edit anything below if needed.
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
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Creating your committee…" : "Create committee"}
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
