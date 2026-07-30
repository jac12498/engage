"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateCampaignBasics } from "@/app/settings/actions"

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
const PARTY_PRESETS = new Set<string>(PARTY_OPTIONS)

interface Initial {
  candidateName: string
  office: string
  party: string
  committeeName: string
  mailingAddress: string
}

interface District {
  name: string | null
  state: string | null
  voterCount: number | null
}

/** Split a stored party string back into the dropdown choice + custom text. */
function splitParty(party: string): { choice: string; custom: string } {
  if (!party) return { choice: "", custom: "" }
  if (party === "Independent") return { choice: "Independent", custom: "" }
  if (PARTY_PRESETS.has(party)) return { choice: party, custom: "" }
  // Any other free-text value came from the "Other" path (or an Independent refinement).
  return { choice: "Other", custom: party }
}

export function SettingsForm({ initial, district }: { initial: Initial; district: District }) {
  const initParty = splitParty(initial.party)

  const [candidateName, setCandidateName] = useState(initial.candidateName)
  const [office, setOffice] = useState(initial.office)
  const [committeeName, setCommitteeName] = useState(initial.committeeName)
  const [mailingAddress, setMailingAddress] = useState(initial.mailingAddress)
  const [partyChoice, setPartyChoice] = useState(initParty.choice)
  const [partyCustom, setPartyCustom] = useState(initParty.custom)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const showCustomParty = PARTY_NEEDS_CUSTOM.has(partyChoice)

  function resolveParty(): string {
    if (!partyChoice) return ""
    if (showCustomParty) {
      return partyCustom.trim() || (partyChoice === "Independent" ? "Independent" : "")
    }
    return partyChoice
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    if (!candidateName.trim()) return setError("Please enter the candidate's name.")
    if (!office.trim()) return setError("Please enter the office sought.")
    if (partyChoice === "Other" && !partyCustom.trim())
      return setError("Please enter your party name.")

    startTransition(async () => {
      const result = await updateCampaignBasics({
        candidateName,
        office,
        party: resolveParty(),
        committeeName,
        mailingAddress,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  const districtLine = district.name
    ? [district.name, district.state].filter(Boolean).join(" · ")
    : null

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Candidate name" required>
            <input
              value={candidateName}
              onChange={(e) => {
                setCandidateName(e.target.value)
                setSaved(false)
              }}
              placeholder="Jane Candidate"
              className={inputCls}
            />
          </Field>
          <Field label="Office sought" required>
            <input
              value={office}
              onChange={(e) => {
                setOffice(e.target.value)
                setSaved(false)
              }}
              placeholder="County Legislature, District 23"
              className={inputCls}
            />
          </Field>
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Party (optional)</span>
            <select
              value={partyChoice}
              onChange={(e) => {
                setPartyChoice(e.target.value)
                if (!PARTY_NEEDS_CUSTOM.has(e.target.value)) setPartyCustom("")
                setSaved(false)
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
                onChange={(e) => {
                  setPartyCustom(e.target.value)
                  setSaved(false)
                }}
                placeholder={
                  partyChoice === "Independent" ? "Party name (optional)" : "Enter your party name"
                }
                className={`${inputCls} mt-2`}
              />
            )}
          </div>
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Committee name (optional)
            </span>
            <input
              value={committeeName}
              onChange={(e) => {
                setCommitteeName(e.target.value)
                setSaved(false)
              }}
              placeholder="Friends of Jane Candidate"
              className={inputCls}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your registered committee. Used for the &ldquo;Paid for by&rdquo; disclaimer.
            </p>
          </div>
          <div className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Mailing address (for newsletters)
            </span>
            <textarea
              value={mailingAddress}
              onChange={(e) => {
                setMailingAddress(e.target.value)
                setSaved(false)
              }}
              rows={2}
              placeholder="123 Main St, Kingston, NY 12401"
              className={`${inputCls} resize-y`}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              A physical postal address is legally required in the footer of every newsletter you
              email (CAN-SPAM). You can&rsquo;t send a newsletter until this is set.
            </p>
          </div>
        </div>
      </section>

      {/* District — snapshotted at onboarding; read-only here. */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Your district</h2>
        {districtLine ? (
          <p className="mt-3 text-sm text-[#1a1a2e]">
            <span className="font-semibold">{districtLine}</span>
            {district.voterCount != null && (
              <span className="text-muted-foreground">
                {" "}
                · {district.voterCount.toLocaleString()} voters
              </span>
            )}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No district selected.</p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Your district links your campaign to the voter file and can&rsquo;t be changed here yet.
          Contact support to move districts.
        </p>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
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
