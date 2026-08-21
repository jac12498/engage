"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateCampaignBasics } from "@/app/settings/actions"
import { ImageAssetCard } from "@/components/settings/ImageAssetCard"

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
  slogan: string
  website: string
  actblueUrl: string
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
  hasLogo: initialHasLogo,
  initial,
  district,
}: {
  campaignId: string
  hasHeadshot: boolean
  hasLogo: boolean
  initial: Initial
  district: District
}) {
  const initParty = splitParty(initial.party)

  const [candidateName, setCandidateName] = useState(initial.candidateName)
  const [office, setOffice] = useState(initial.office)
  const [committeeName, setCommitteeName] = useState(initial.committeeName)
  const [partyChoice, setPartyChoice] = useState(initParty.choice)
  const [partyCustom, setPartyCustom] = useState(initParty.custom)
  const [slogan, setSlogan] = useState(initial.slogan)
  const [website, setWebsite] = useState(initial.website)
  const [actblueUrl, setActblueUrl] = useState(initial.actblueUrl)

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
        committeeName,
        slogan,
        website,
        actblueUrl,
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

          <p className="text-xs text-muted-foreground sm:col-span-2 -mt-1">
            Fusion endorsements (extra ballot lines, like Working Families) are set per election
            cycle in <span className="font-medium text-[#1a1a2e]">Campaigns</span>.
          </p>
        </div>
      </section>

      {/* Candidate assets */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate Assets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Reusable brand elements — surfaced across your website, newsletters, and materials.
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ImageAssetCard
            label="Headshot"
            hint="PNG, JPEG, WebP, or GIF up to 3 MB."
            round
            id={campaignId}
            uploadPath="/api/website/headshot"
            getPath="/api/website/headshot"
            initialHas={initialHasHeadshot}
            onError={setError}
          />
          <ImageAssetCard
            label="Logo"
            hint="PNG, JPEG, WebP, GIF, or SVG up to 3 MB."
            id={campaignId}
            uploadPath="/api/candidate/logo"
            getPath="/api/candidate/logo"
            initialHas={initialHasLogo}
            onError={setError}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Slogan">
            <input value={slogan} onChange={(e) => { setSlogan(e.target.value); dirty() }} placeholder="A short campaign tagline" className={inputCls} />
          </Field>
          <div className="hidden sm:block" />
          <Field label="ActBlue / donate link">
            <input value={actblueUrl} onChange={(e) => { setActblueUrl(e.target.value); dirty() }} placeholder="https://secure.actblue.com/…" className={inputCls} />
          </Field>
          <Field label="Website link">
            <input value={website} onChange={(e) => { setWebsite(e.target.value); dirty() }} placeholder="https://janecandidate.com" className={inputCls} />
          </Field>
        </div>
      </section>

      {/* Mailing address */}
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate Mailing Address</h2>
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Candidate District</h2>
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
          Your district links your candidate to the voter file and can&rsquo;t be changed here yet.
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
