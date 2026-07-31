"use client"

import { useRef, useState, useTransition } from "react"
import { CheckCircle2, Loader2, Upload, Trash2, X, Plus } from "lucide-react"
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
// Endorsements are named party lines (fusion voting), so exclude the free-text options.
const ENDORSEMENT_OPTIONS = PARTY_OPTIONS.filter((p) => !PARTY_NEEDS_CUSTOM.has(p))

interface Initial {
  candidateName: string
  office: string
  party: string
  additionalParties: string[]
  committeeName: string
  mailingStreet: string
  mailingStreet2: string
  mailingCity: string
  mailingState: string
  mailingZip: string
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
  return { choice: "Other", custom: party }
}

export function SettingsForm({
  campaignId,
  hasHeadshot: initialHasHeadshot,
  initial,
  district,
}: {
  campaignId: string
  hasHeadshot: boolean
  initial: Initial
  district: District
}) {
  const initParty = splitParty(initial.party)

  const [candidateName, setCandidateName] = useState(initial.candidateName)
  const [office, setOffice] = useState(initial.office)
  const [committeeName, setCommitteeName] = useState(initial.committeeName)
  const [partyChoice, setPartyChoice] = useState(initParty.choice)
  const [partyCustom, setPartyCustom] = useState(initParty.custom)
  const [endorsements, setEndorsements] = useState<string[]>(initial.additionalParties)
  const [endorsePick, setEndorsePick] = useState("")

  const [street, setStreet] = useState(initial.mailingStreet)
  const [street2, setStreet2] = useState(initial.mailingStreet2)
  const [city, setCity] = useState(initial.mailingCity)
  const [stateAbbr, setStateAbbr] = useState(initial.mailingState)
  const [zip, setZip] = useState(initial.mailingZip)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const dirty = () => setSaved(false)
  const showCustomParty = PARTY_NEEDS_CUSTOM.has(partyChoice)

  function resolveParty(): string {
    if (!partyChoice) return ""
    if (showCustomParty) {
      return partyCustom.trim() || (partyChoice === "Independent" ? "Independent" : "")
    }
    return partyChoice
  }

  // Endorsement options not already chosen and not equal to the primary party.
  const availableEndorsements = ENDORSEMENT_OPTIONS.filter(
    (p) => p !== resolveParty() && !endorsements.includes(p)
  )

  function addEndorsement() {
    if (!endorsePick) return
    setEndorsements((prev) => [...prev, endorsePick])
    setEndorsePick("")
    dirty()
  }
  function removeEndorsement(p: string) {
    setEndorsements((prev) => prev.filter((x) => x !== p))
    dirty()
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    if (!candidateName.trim()) return setError("Please enter the candidate's name.")
    if (!office.trim()) return setError("Please enter the office sought.")
    if (!partyChoice) return setError("Please select a party.")
    if (partyChoice === "Other" && !partyCustom.trim())
      return setError("Please enter your party name.")
    if (!committeeName.trim()) return setError("Please enter a committee name.")

    startTransition(async () => {
      const result = await updateCampaignBasics({
        candidateName,
        office,
        party: resolveParty(),
        additionalParties: endorsements,
        committeeName,
        mailingStreet: street,
        mailingStreet2: street2,
        mailingCity: city,
        mailingState: stateAbbr,
        mailingZip: zip,
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
            <input value={candidateName} onChange={(e) => { setCandidateName(e.target.value); dirty() }} placeholder="Jane Candidate" className={inputCls} />
          </Field>
          <Field label="Office sought" required>
            <input value={office} onChange={(e) => { setOffice(e.target.value); dirty() }} placeholder="County Legislature, District 23" className={inputCls} />
          </Field>

          {/* Primary party */}
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Party<span className="ml-0.5 text-red-500">*</span>
            </span>
            <select
              value={partyChoice}
              onChange={(e) => {
                setPartyChoice(e.target.value)
                if (!PARTY_NEEDS_CUSTOM.has(e.target.value)) setPartyCustom("")
                // Drop any endorsement that now equals the primary.
                setEndorsements((prev) => prev.filter((x) => x !== e.target.value))
                dirty()
              }}
              className={selectCls}
            >
              <option value="">Select party…</option>
              {PARTY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {showCustomParty && (
              <input
                value={partyCustom}
                onChange={(e) => { setPartyCustom(e.target.value); dirty() }}
                placeholder={partyChoice === "Independent" ? "Party name (optional)" : "Enter your party name"}
                className={`${inputCls} mt-2`}
              />
            )}
          </div>

          {/* Committee — now required */}
          <Field label="Committee name" required>
            <input value={committeeName} onChange={(e) => { setCommitteeName(e.target.value); dirty() }} placeholder="Friends of Jane Candidate" className={inputCls} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Used for the &ldquo;Paid for by&rdquo; disclaimer. If you haven&rsquo;t set up an
              official committee yet, enter your intended name — you can update it later to match
              the official name if it ends up different.
            </p>
          </Field>

          {/* Party endorsements */}
          <div className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
              Additional party endorsements (optional)
            </span>
            {endorsements.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {endorsements.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-[#1b3a6b]/8 px-3 py-1 text-sm font-medium text-[#1b3a6b]">
                    {p}
                    <button type="button" onClick={() => removeEndorsement(p)} className="text-[#1b3a6b]/60 hover:text-[#1b3a6b]" aria-label={`Remove ${p}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select value={endorsePick} onChange={(e) => setEndorsePick(e.target.value)} disabled={availableEndorsements.length === 0} className={`${selectCls} flex-1`}>
                <option value="">{availableEndorsements.length ? "Add an endorsing party…" : "No more parties to add"}</option>
                {availableEndorsements.map((p) => (
                  <option key={p} value={p}>{p}</option>
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

      {/* Headshot */}
      <HeadshotCard campaignId={campaignId} initialHasHeadshot={initialHasHeadshot} onError={setError} />

      {/* Mailing address */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Mailing address</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          A physical postal address is legally required in the footer of every newsletter you email
          (CAN-SPAM). You can&rsquo;t send a newsletter until this is set.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Street address">
            <input value={street} onChange={(e) => { setStreet(e.target.value); dirty() }} placeholder="123 Main St" className={inputCls} />
          </Field>
          <Field label="Apt / Suite (optional)">
            <input value={street2} onChange={(e) => { setStreet2(e.target.value); dirty() }} placeholder="Suite 200" className={inputCls} />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => { setCity(e.target.value); dirty() }} placeholder="Kingston" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State">
              <input value={stateAbbr} onChange={(e) => { setStateAbbr(e.target.value.toUpperCase().slice(0, 2)); dirty() }} placeholder="NY" maxLength={2} className={inputCls} />
            </Field>
            <Field label="ZIP">
              <input value={zip} onChange={(e) => { setZip(e.target.value); dirty() }} placeholder="12401" className={inputCls} />
            </Field>
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
              <span className="text-muted-foreground"> · {district.voterCount.toLocaleString()} voters</span>
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
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}

/** Headshot upload/preview/remove — hits the existing /api/website/headshot routes (now Campaign-backed). */
function HeadshotCard({
  campaignId,
  initialHasHeadshot,
  onError,
}: {
  campaignId: string
  initialHasHeadshot: boolean
  onError: (msg: string | null) => void
}) {
  const [hasHeadshot, setHasHeadshot] = useState(initialHasHeadshot)
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    onError(null)
    setBusy(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/website/headshot", { method: "POST", body: form })
      if (!res.ok) {
        onError((await res.text()) || "Upload failed.")
        return
      }
      setHasHeadshot(true)
      setVersion((v) => v + 1)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove() {
    onError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/website/headshot", { method: "DELETE" })
      if (!res.ok) {
        onError((await res.text()) || "Could not remove the photo.")
        return
      }
      setHasHeadshot(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate headshot</h2>
      <p className="mt-1 text-xs text-muted-foreground">Optional. Used on your website and materials. PNG, JPEG, WebP, or GIF up to 3&nbsp;MB.</p>
      <div className="mt-4 flex items-center gap-5">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[#f4f6f9]">
          {hasHeadshot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/website/headshot/${campaignId}?v=${version}`} alt="Candidate headshot" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-muted-foreground">No photo</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) upload(f)
            }}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            {hasHeadshot ? "Replace" : "Upload photo"}
          </Button>
          {hasHeadshot && (
            <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Remove
            </button>
          )}
        </div>
      </div>
    </section>
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
