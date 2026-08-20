"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateSiteSettings } from "@/app/website/blocks-actions"

const FONT_THEMES = [
  { id: "classic", label: "Classic (sans-serif)" },
  { id: "modern", label: "Modern (geometric)" },
  { id: "serif", label: "Serif (traditional)" },
]

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export interface SiteSettingsValues {
  siteTitle: string
  paidForBy: string
  primaryColor: string
  accentColor: string
  fontTheme: string
  donateUrl: string
  contactEmail: string
}

/** Identity, theme + calls-to-action for the committee's public site. */
export function SiteSettingsForm({ initial }: { initial: SiteSettingsValues }) {
  const router = useRouter()
  const [siteTitle, setSiteTitle] = useState(initial.siteTitle)
  const [paidForBy, setPaidForBy] = useState(initial.paidForBy)
  const [primaryColor, setPrimary] = useState(initial.primaryColor)
  const [accentColor, setAccent] = useState(initial.accentColor)
  const [fontTheme, setFont] = useState(initial.fontTheme)
  const [donateUrl, setDonate] = useState(initial.donateUrl)
  const [contactEmail, setEmail] = useState(initial.contactEmail)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, startSaving] = useTransition()

  const dirty = () => setSaved(false)

  function save() {
    setError(null)
    startSaving(async () => {
      const res = await updateSiteSettings({ siteTitle, paidForBy, primaryColor, accentColor, fontTheme, donateUrl, contactEmail })
      if (res.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 1500)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Identity</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Site title</span>
          <input value={siteTitle} onChange={(e) => { setSiteTitle(e.target.value); dirty() }} placeholder="Committee name" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">&ldquo;Paid for by&rdquo; line</span>
          <input value={paidForBy} onChange={(e) => { setPaidForBy(e.target.value); dirty() }} placeholder="Committee name" className={inputCls} />
        </label>
      </div>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Theme & links</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Primary color</span>
          <div className="flex items-center gap-2">
            <input type="color" value={primaryColor} onChange={(e) => { setPrimary(e.target.value); dirty() }} className="h-9 w-14 cursor-pointer rounded border border-border" />
            <input value={primaryColor} onChange={(e) => { setPrimary(e.target.value); dirty() }} className={inputCls} />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Accent color</span>
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => { setAccent(e.target.value); dirty() }} className="h-9 w-14 cursor-pointer rounded border border-border" />
            <input value={accentColor} onChange={(e) => { setAccent(e.target.value); dirty() }} className={inputCls} />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Font style</span>
          <select value={fontTheme} onChange={(e) => { setFont(e.target.value); dirty() }} className={inputCls}>
            {FONT_THEMES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>
        <div className="hidden sm:block" />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Donate link</span>
          <input value={donateUrl} onChange={(e) => { setDonate(e.target.value); dirty() }} placeholder="https://secure.actblue.com/…" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Contact email</span>
          <input value={contactEmail} onChange={(e) => { setEmail(e.target.value); dirty() }} placeholder="hello@campaign.org" className={inputCls} />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4">
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check className="mr-1.5 h-4 w-4" /> Saved</>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </div>
  )
}
