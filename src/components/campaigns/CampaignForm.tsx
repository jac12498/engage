"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, X, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fetchChildDistricts, submitCampaign } from "@/app/campaigns/actions"
import type { DistrictNode } from "@/lib/districts"

/** One level of the hierarchy: the children available, and what's chosen here. */
interface Level {
  options: DistrictNode[]
  selectedType: string | null
  selectedId: string | null
}

function uniqueTypes(options: DistrictNode[]): string[] {
  return Array.from(new Set(options.map((d) => d.typeName).filter(Boolean))).sort()
}

// Ballot lines we offer directly; Independent/Other let the user name their own.
const PARTY_OPTIONS = [
  "Democrat",
  "Republican",
  "Conservative",
  "Working Families",
  "Independent",
  "Other",
] as const

const PARTY_NEEDS_CUSTOM = new Set<string>(["Independent", "Other"])
// Endorsements are named party lines (fusion voting), so exclude the free-text options.
const ENDORSEMENT_OPTIONS = PARTY_OPTIONS.filter((p) => !PARTY_NEEDS_CUSTOM.has(p))

export function CampaignForm({ topDistricts }: { topDistricts: DistrictNode[] }) {
  const [candidateName, setCandidateName] = useState("")
  const [office, setOffice] = useState("")
  const [committeeName, setCommitteeName] = useState("")
  const [partyChoice, setPartyChoice] = useState("")
  const [partyCustom, setPartyCustom] = useState("")
  const [endorsements, setEndorsements] = useState<string[]>([])
  const [endorsePick, setEndorsePick] = useState("")

  const showCustomParty = PARTY_NEEDS_CUSTOM.has(partyChoice)

  /** Resolve the dropdown + optional custom field into a single party string. */
  function resolveParty(): string {
    if (!partyChoice) return ""
    if (showCustomParty) {
      return partyCustom.trim() || (partyChoice === "Independent" ? "Independent" : "")
    }
    return partyChoice
  }

  const availableEndorsements = ENDORSEMENT_OPTIONS.filter(
    (p) => p !== resolveParty() && !endorsements.includes(p)
  )
  function addEndorsement() {
    if (!endorsePick) return
    setEndorsements((prev) => [...prev, endorsePick])
    setEndorsePick("")
  }
  function removeEndorsement(p: string) {
    setEndorsements((prev) => prev.filter((x) => x !== p))
  }

  const [levels, setLevels] = useState<Level[]>([
    { options: topDistricts, selectedType: null, selectedId: null },
  ])
  const [loadingLevel, setLoadingLevel] = useState<number | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // The candidate's chosen district = the deepest level that has a selection.
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

  function handleTypeChange(levelIndex: number, typeName: string) {
    setError(null)
    setLevels((prev) => {
      const next = prev.slice(0, levelIndex + 1)
      next[levelIndex] = { ...next[levelIndex], selectedType: typeName || null, selectedId: null }
      return next
    })
  }

  async function handleDistrictChange(levelIndex: number, districtId: string) {
    setError(null)
    if (!districtId) {
      setLevels((prev) => {
        const next = prev.slice(0, levelIndex + 1)
        next[levelIndex] = { ...next[levelIndex], selectedId: null }
        return next
      })
      return
    }

    setLevels((prev) => {
      const next = prev.slice(0, levelIndex + 1)
      next[levelIndex] = { ...next[levelIndex], selectedId: districtId }
      return next
    })

    const node = levels[levelIndex].options.find((d) => d.id === districtId)
    if (!node?.hasChildren) return

    // Drill down: fetch children and open the next level.
    setLoadingLevel(levelIndex + 1)
    const children = await fetchChildDistricts(districtId)
    setLoadingLevel(null)
    if (children.length > 0) {
      setLevels((prev) => [
        ...prev.slice(0, levelIndex + 1),
        { options: children, selectedType: null, selectedId: null },
      ])
    }
  }

  function handleClear(levelIndex: number) {
    setError(null)
    setLevels((prev) => {
      const next = prev.slice(0, levelIndex + 1)
      next[levelIndex] = { ...next[levelIndex], selectedType: null, selectedId: null }
      return next
    })
  }

  function handleSubmit() {
    setError(null)
    if (!candidateName.trim()) return setError("Please enter the candidate's name.")
    if (!office.trim()) return setError("Please enter the office sought.")
    if (!partyChoice) return setError("Please select a party.")
    if (partyChoice === "Other" && !partyCustom.trim())
      return setError("Please enter your party name.")
    if (!committeeName.trim()) return setError("Please enter a committee name.")

    startTransition(async () => {
      const result = await submitCampaign({
        candidateName,
        office,
        party: resolveParty(),
        additionalParties: endorsements,
        committeeName,
        districtId: selected?.id,
      })
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Candidate */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Candidate name" required>
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Jane Candidate"
              className={inputCls}
            />
          </Field>
          <Field label="Office sought" required>
            <input
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              placeholder="Town Council, Town of Woodstock"
              className={inputCls}
            />
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
              className={selectCls}
            >
              <option value="">Select party…</option>
              {PARTY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {showCustomParty && (
              <input
                value={partyCustom}
                onChange={(e) => setPartyCustom(e.target.value)}
                placeholder={
                  partyChoice === "Independent" ? "Party name (optional)" : "Enter your party name"
                }
                className={`${inputCls} mt-2`}
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <Field label="Committee name (for “Paid for by”)" required>
              <input
                value={committeeName}
                onChange={(e) => setCommitteeName(e.target.value)}
                placeholder="Friends of Jane Candidate"
                className={inputCls}
              />
            </Field>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Used for the &ldquo;Paid for by&rdquo; line on this campaign&rsquo;s website and
              communications. This can be the candidate&rsquo;s own committee or your committee,
              depending on who&rsquo;s funding the race.
            </p>
          </div>

          {/* Party endorsements */}
          <div className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Additional party endorsements (optional)
            </span>
            {endorsements.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {endorsements.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#1b3a6b]/8 px-3 py-1 text-sm font-medium text-[#1b3a6b]"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removeEndorsement(p)}
                      className="text-[#1b3a6b]/60 hover:text-[#1b3a6b]"
                      aria-label={`Remove ${p}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select
                value={endorsePick}
                onChange={(e) => setEndorsePick(e.target.value)}
                disabled={availableEndorsements.length === 0}
                className={`${selectCls} flex-1`}
              >
                <option value="">
                  {availableEndorsements.length ? "Add an endorsing party…" : "No more parties to add"}
                </option>
                {availableEndorsements.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" onClick={addEndorsement} disabled={!endorsePick}>
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              For fusion voting — e.g. running on both the Democratic and Working Families lines.
            </p>
          </div>
        </div>
      </section>

      {/* District */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
          District (optional)
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose a district type, then the specific district. You can stop at any level, or keep
          drilling down to a town, ward, or legislative district. This is how we match the campaign
          to the right voters. Voter File, Voter Outreach, and Field Tools aren&rsquo;t available in
          every state yet — Communications and the website work nationwide, so you can skip this and
          add it later.
        </p>

        <div className="mt-5 space-y-4">
          {levels.map((level, i) => {
            const types = uniqueTypes(level.options)
            const effectiveType = types.length === 1 ? types[0] : level.selectedType
            const districts = effectiveType
              ? level.options.filter((d) => d.typeName === effectiveType)
              : []

            return (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                {types.length > 1 ? (
                  <Field label={i === 0 ? "State" : "District type"}>
                    <select
                      value={level.selectedType ?? ""}
                      onChange={(e) => handleTypeChange(i, e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Select type…</option>
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <div className="hidden sm:block" />
                )}

                {effectiveType ? (
                  <Field label={effectiveType}>
                    <select
                      value={level.selectedId ?? ""}
                      onChange={(e) => handleDistrictChange(i, e.target.value)}
                      className={selectCls}
                    >
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

                {i > 0 && level.selectedId ? (
                  <button
                    type="button"
                    onClick={() => handleClear(i)}
                    className="inline-flex h-[42px] items-center gap-1 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>
            )
          })}

          {loadingLevel != null && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading sub-districts…
            </p>
          )}
        </div>

        {selected && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border-2 border-green-600/30 bg-green-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
            <div>
              <p className="text-sm text-green-900">
                Selected: <span className="font-semibold">{selected.name}</span>{" "}
                <span className="text-green-800/70">({selected.typeName})</span>
                {selected.voterCount != null && <> · {selected.voterCount.toLocaleString()} voters</>}
              </p>
              {selected.hasChildren && (
                <p className="mt-0.5 text-xs text-green-800/80">
                  You can keep drilling down above, or use this district as-is.
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

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
