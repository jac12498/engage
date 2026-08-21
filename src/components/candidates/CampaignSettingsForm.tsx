"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateCampaignEndorsements } from "@/app/candidates/actions"

// Named party lines a candidate can be cross-endorsed on (fusion voting). Excludes
// the free-text "Independent"/"Other" primary-party options.
const ENDORSEMENT_OPTIONS = ["Democrat", "Republican", "Conservative", "Working Families"] as const

/**
 * Per-run ballot-line settings for the ACTIVE campaign. The office + primary party are
 * shown as read-only context (edited on Candidate settings); the fusion endorsements —
 * which vary from cycle to cycle — are edited here.
 */
export function CampaignSettingsForm({
  cycle,
  office,
  party,
  initialEndorsements,
}: {
  cycle: number
  office: string
  party: string | null
  initialEndorsements: string[]
}) {
  const [endorsements, setEndorsements] = useState<string[]>(initialEndorsements)
  const [pick, setPick] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const available = ENDORSEMENT_OPTIONS.filter(
    (p) => p !== (party ?? "") && !endorsements.includes(p)
  )

  function add() {
    if (!pick) return
    setEndorsements((prev) => [...prev, pick])
    setPick("")
    setSaved(false)
  }
  function remove(p: string) {
    setEndorsements((prev) => prev.filter((x) => x !== p))
    setSaved(false)
  }

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateCampaignEndorsements(endorsements)
      if (!res.ok) return setError(res.error)
      setSaved(true)
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Ballot line &amp; endorsements</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Settings for the <span className="font-medium text-[#1a1a2e]">{cycle}</span> run
        {office ? <> — {office}</> : null}
        {party ? <> on the <span className="font-medium text-[#1a1a2e]">{party}</span> line</> : null}.
      </p>

      <div className="mt-5 block">
        <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Additional party endorsements</span>
        {endorsements.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {endorsements.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-[#1b3a6b]/8 px-3 py-1 text-sm font-medium text-[#1b3a6b]">
                {p}
                <button type="button" onClick={() => remove(p)} className="text-[#1b3a6b]/60 hover:text-[#1b3a6b]" aria-label={`Remove ${p}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <select
            value={pick}
            onChange={(e) => setPick(e.target.value)}
            disabled={available.length === 0}
            className="w-full flex-1 rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
          >
            <option value="">{available.length ? "Add an endorsing party…" : "No more parties to add"}</option>
            {available.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <Button type="button" variant="outline" onClick={add} disabled={!pick}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          For fusion voting — e.g. running on both the Democratic and Working Families lines. This can
          differ from one election cycle to the next.
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save endorsements"}
        </Button>
      </div>
    </section>
  )
}
