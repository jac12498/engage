"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, X, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchChildDistricts, submitCampaign } from "@/app/candidates/actions"
import { CommitteeRegistrySearch } from "@/components/committees/CommitteeRegistrySearch"
import type { DistrictNode } from "@/lib/districts"

interface Level {
  options: DistrictNode[]
  selectedType: string | null
  selectedId: string | null
}

function uniqueTypes(options: DistrictNode[]): string[] {
  return Array.from(new Set(options.map((d) => d.typeName).filter(Boolean))).sort()
}

const PARTY_OPTIONS = ["Democrat", "Republican", "Conservative", "Working Families", "Independent", "Other"] as const
const PARTY_NEEDS_CUSTOM = new Set<string>(["Independent", "Other"])
const ENDORSEMENT_OPTIONS = PARTY_OPTIONS.filter((p) => !PARTY_NEEDS_CUSTOM.has(p))

/** Add a campaign (run) under the active candidate — one race in a cycle. */
export function CampaignRunForm({
  topDistricts,
  committeeState,
  candidateName,
}: {
  topDistricts: DistrictNode[]
  committeeState: string
  candidateName: string
}) {
  const [cycle, setCycle] = useState(String(new Date().getFullYear()))
  const [office, setOffice] = useState("")
  const [committeeName, setCommitteeName] = useState("")
  const [filerId, setFilerId] = useState("")
  const [partyChoice, setPartyChoice] = useState("")
  const [partyCustom, setPartyCustom] = useState("")
  const [endorsements, setEndorsements] = useState<string[]>([])
  const [endorsePick, setEndorsePick] = useState("")

  const showCustomParty = PARTY_NEEDS_CUSTOM.has(partyChoice)
  function resolveParty(): string {
    if (!partyChoice) return ""
    if (showCustomParty) return partyCustom.trim() || (partyChoice === "Independent" ? "Independent" : "")
    return partyChoice
  }
  const availableEndorsements = ENDORSEMENT_OPTIONS.filter((p) => p !== resolveParty() && !endorsements.includes(p))
  function addEndorsement() {
    if (!endorsePick) return
    setEndorsements((prev) => [...prev, endorsePick])
    setEndorsePick("")
  }

  const [levels, setLevels] = useState<Level[]>([{ options: topDistricts, selectedType: null, selectedId: null }])
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = useMemo<DistrictNode | null>(() => {
    let found: DistrictNode | null = null
    for (const lvl of levels) {
      if (lvl.selectedId) {
        const node = lvl.options.find((d) => d.id === lvl.selectedId)
        if (node) found = node
      }
    }
    return found
  }, [levels])

  function handleTypeChange(i: number, typeName: string) {
    setError(null)
    setLevels((prev) => {
      const next = prev.slice(0, i + 1)
      next[i] = { ...next[i], selectedType: typeName || null, selectedId: null }
      return next
    })
  }
  async function handleDistrictChange(i: number, districtId: string) {
    setError(null)
    if (!districtId) {
      setLevels((prev) => {
        const next = prev.slice(0, i + 1)
        next[i] = { ...next[i], selectedId: null }
        return next
      })
      return
    }
    setLevels((prev) => {
      const next = prev.slice(0, i + 1)
      next[i] = { ...next[i], selectedId: districtId }
      return next
    })
    const node = levels[i].options.find((d) => d.id === districtId)
    if (!node?.hasChildren) return
    setLoadingLevel(i + 1)
    const children = await fetchChildDistricts(districtId)
    setLoadingLevel(null)
    if (children.length > 0) {
      setLevels((prev) => [...prev.slice(0, i + 1), { options: children, selectedType: null, selectedId: null }])
    }
  }

  function handleSubmit() {
    setError(null)
    const year = Number(cycle)
    if (!Number.isInteger(year) || year < 1990 || year > 2100) return setError("Enter a valid election year.")
    if (!office.trim()) return setError("Please enter the office sought.")
    if (!partyChoice) return setError("Please select a party.")
    if (partyChoice === "Other" && !partyCustom.trim()) return setError("Please enter your party name.")
    if (!committeeName.trim()) return setError("Please enter a committee name.")

    startTransition(async () => {
      const result = await submitCampaign({
        cycle: year,
        office,
        party: resolveParty(),
        additionalParties: endorsements,
        committeeName,
        filerId: filerId.trim() || undefined,
        districtId: selected?.id,
      })
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
          {candidateName} — the run
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Election year (cycle)" required>
            <input value={cycle} onChange={(e) => setCycle(e.target.value)} inputMode="numeric" placeholder="2026" className={inputCls} />
          </Field>
          <Field label="Office sought" required>
            <input value={office} onChange={(e) => setOffice(e.target.value)} placeholder="Town Council, Town of Woodstock" className={inputCls} />
          </Field>
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Party<span className="ml-0.5 text-red-500">*</span>
            </span>
            <select
              value={partyChoice}
              onChange={(e) => {
                setPartyChoice(e.target.value)
                if (!PARTY_NEEDS_CUSTOM.has(e.target.value)) setPartyCustom("")
                setEndorsements((prev) => prev.filter((x) => x !== e.target.value))
              }}
              className={inputCls}
            >
              <option value="">Select party…</option>
              {PARTY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {showCustomParty && (
              <input value={partyCustom} onChange={(e) => setPartyCustom(e.target.value)} placeholder="Party name" className={`${inputCls} mt-2`} />
            )}
          </div>
          <div className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Additional party endorsements (optional)</span>
            {endorsements.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {endorsements.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-[#1b3a6b]/8 px-3 py-1 text-sm font-medium text-[#1b3a6b]">
                    {p}
                    <button type="button" onClick={() => setEndorsements((prev) => prev.filter((x) => x !== p))} aria-label={`Remove ${p}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select value={endorsePick} onChange={(e) => setEndorsePick(e.target.value)} disabled={availableEndorsements.length === 0} className={`${inputCls} flex-1`}>
                <option value="">{availableEndorsements.length ? "Add an endorsing party…" : "No more parties to add"}</option>
                {availableEndorsements.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addEndorsement} disabled={!endorsePick}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Candidate&rsquo;s committee (for &ldquo;Paid for by&rdquo;)<span className="ml-0.5 text-red-500">*</span>
            </span>
            <CommitteeRegistrySearch
              state={committeeState}
              defaultQuery={committeeName}
              placeholder="Search committee name"
              onSelect={(m) => {
                setCommitteeName(m.name)
                setFilerId(m.filerId)
                setError(null)
              }}
            />
            <input
              value={committeeName}
              onChange={(e) => {
                setCommitteeName(e.target.value)
                setFilerId("")
              }}
              placeholder="Friends of Jane Candidate"
              className={`${inputCls} mt-2`}
            />
            {filerId && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#1e6b3a]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Linked to committee filer {filerId}.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">District (optional)</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose the district for this run, or skip it — Communications and the website work without it.
        </p>
        <div className="mt-5 space-y-4">
          {levels.map((level, i) => {
            const types = uniqueTypes(level.options)
            const effectiveType = types.length === 1 ? types[0] : level.selectedType
            const districts = effectiveType ? level.options.filter((d) => d.typeName === effectiveType) : []
            return (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr] sm:items-end">
                {types.length > 1 ? (
                  <Field label={i === 0 ? "State" : "District type"}>
                    <select value={level.selectedType ?? ""} onChange={(e) => handleTypeChange(i, e.target.value)} className={inputCls}>
                      <option value="">Select type…</option>
                      {types.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {effectiveType ? (
                  <Field label={effectiveType}>
                    <select value={level.selectedId ?? ""} onChange={(e) => handleDistrictChange(i, e.target.value)} className={inputCls}>
                      <option value="">Select {effectiveType.toLowerCase()}…</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                          {d.voterCount != null ? ` (${d.voterCount.toLocaleString()} voters)` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            )
          })}
          {loadingLevel != null && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading sub-districts…
            </p>
          )}
        </div>
        {selected && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border-2 border-green-600/30 bg-green-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
            <p className="text-sm text-green-900">
              Selected: <span className="font-semibold">{selected.name}</span>{" "}
              <span className="text-green-800/70">({selected.typeName})</span>
            </p>
          </div>
        )}
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Adding campaign…" : "Add campaign"}
        </Button>
      </div>
    </div>
  )
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
