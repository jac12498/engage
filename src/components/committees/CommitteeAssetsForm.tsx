"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ImageAssetCard } from "@/components/settings/ImageAssetCard"
import { updateCommitteeAssets } from "@/app/committees/actions"

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

interface Initial {
  actblueUrl: string
  websiteUrl: string
  mailingStreet: string
  mailingStreet2: string
  mailingCity: string
  mailingState: string
  mailingZip: string
}

/** Committee-level assets (logo, donate + website links) and mailing address. */
export function CommitteeAssetsForm({
  committeeId,
  hasLogo,
  initial,
}: {
  committeeId: string
  hasLogo: boolean
  initial: Initial
}) {
  const [actblueUrl, setActblueUrl] = useState(initial.actblueUrl)
  const [websiteUrl, setWebsiteUrl] = useState(initial.websiteUrl)
  const [street, setStreet] = useState(initial.mailingStreet)
  const [street2, setStreet2] = useState(initial.mailingStreet2)
  const [city, setCity] = useState(initial.mailingCity)
  const [stateAbbr, setStateAbbr] = useState(initial.mailingState)
  const [zip, setZip] = useState(initial.mailingZip)

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const dirty = () => setSaved(false)

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const res = await updateCommitteeAssets({
        actblueUrl,
        websiteUrl,
        mailingStreet: street,
        mailingStreet2: street2,
        mailingCity: city,
        mailingState: stateAbbr,
        mailingZip: zip,
      })
      if (!res.ok) return setError(res.error)
      setSaved(true)
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Committee Assets</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Reusable brand elements for the committee — used across the committee site and materials.
        </p>

        <div className="mt-4 max-w-sm">
          <ImageAssetCard
            label="Logo"
            hint="PNG, JPEG, WebP, GIF, or SVG up to 3 MB."
            id={committeeId}
            uploadPath="/api/committee/logo"
            getPath="/api/committee/logo"
            initialHas={hasLogo}
            onError={setError}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="ActBlue / donate link">
            <input value={actblueUrl} onChange={(e) => { setActblueUrl(e.target.value); dirty() }} placeholder="https://secure.actblue.com/…" className={inputCls} />
          </Field>
          <Field label="Website link">
            <input value={websiteUrl} onChange={(e) => { setWebsiteUrl(e.target.value); dirty() }} placeholder="https://ourcommittee.org" className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Committee Mailing Address</h2>
        <p className="mt-1 text-xs text-muted-foreground">The committee&rsquo;s postal address, for disclaimers and newsletters.</p>
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

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && !isPending && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1e6b3a]">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <Button onClick={save} disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">{label}</span>
      {children}
    </label>
  )
}
