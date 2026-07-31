"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { renderNewsletterEmail, type EmailRenderCtx } from "@/lib/newsletter/renderEmail"
import type { NewsletterTemplate } from "@/lib/newsletter/template"
import { updateNewsletterTemplate } from "@/app/newsletters/actions"

interface EditorCampaign {
  candidateName: string
  committeeName: string | null
  headshotMime: string | null
  mailing: { street: string | null; street2: string | null; city: string | null; state: string | null; zip: string | null }
}

// A representative issue so the preview shows the template in context.
const SAMPLE_BLOCKS = [
  { id: "h", type: "heading", props: { text: "A quick update from the campaign" } },
  {
    id: "t",
    type: "text",
    props: {
      body:
        "Thanks for following along. This week we knocked on 500 doors and heard from neighbors about what matters most.\n\nWith your help, we're just getting started.",
    },
  },
  { id: "b", type: "button", props: { label: "Chip in $25", href: "#", align: "center" } },
]

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function NewsletterTemplateEditor({
  campaignId,
  campaign,
  template: initial,
}: {
  campaignId: string
  campaign: EditorCampaign
  template: NewsletterTemplate
}) {
  const router = useRouter()
  const [tpl, setTpl] = useState<NewsletterTemplate>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, startSave] = useTransition()
  const [origin, setOrigin] = useState("")

  useEffect(() => setOrigin(window.location.origin), [])

  const dirty = () => setSaved(false)
  const setTheme = (patch: Partial<NewsletterTemplate["theme"]>) => {
    setTpl((t) => ({ ...t, theme: { ...t.theme, ...patch } }))
    dirty()
  }
  const setHeader = (patch: Partial<NewsletterTemplate["header"]>) => {
    setTpl((t) => ({ ...t, header: { ...t.header, ...patch } }))
    dirty()
  }
  const setFooter = (patch: Partial<NewsletterTemplate["footer"]>) => {
    setTpl((t) => ({ ...t, footer: { ...t.footer, ...patch } }))
    dirty()
  }

  const previewHtml = useMemo(() => {
    const ctx: EmailRenderCtx = {
      subject: "Newsletter preview",
      candidateName: campaign.candidateName,
      committeeName: campaign.committeeName,
      campaignId,
      mailing: campaign.mailing,
      unsubscribeUrl: "#",
      headshotUrl: campaign.headshotMime && origin ? `${origin}/api/website/headshot/${campaignId}` : null,
    }
    return renderNewsletterEmail(tpl, SAMPLE_BLOCKS, ctx)
  }, [tpl, campaign, campaignId, origin])

  function save() {
    setError(null)
    startSave(async () => {
      const res = await updateNewsletterTemplate(tpl)
      if (!res.ok) setError(res.error)
      else {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 1500)
      }
    })
  }

  return (
    <div>
      <Link href="/newsletters" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]">
        <ArrowLeft className="h-4 w-4" /> All newsletters
      </Link>
      <div className="mt-3">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Newsletter template</h1>
        <p className="mt-1 text-muted-foreground">The header, footer, and theme every issue shares. The required legal footer (committee, address, unsubscribe) is always included.</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Controls */}
        <div className="space-y-5">
          {/* Header */}
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Header</h2>
            <div className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm text-[#1a1a2e]">
                <input type="checkbox" checked={tpl.header.showLogo} onChange={(e) => setHeader({ showLogo: e.target.checked })} />
                Show name / logo text
              </label>
              {tpl.header.showLogo && (
                <input
                  value={tpl.header.logoText}
                  onChange={(e) => setHeader({ logoText: e.target.value })}
                  placeholder={campaign.committeeName || campaign.candidateName}
                  className={inputCls}
                />
              )}
              <label className="flex items-center gap-2 text-sm text-[#1a1a2e]">
                <input type="checkbox" checked={tpl.header.showHeadshot} onChange={(e) => setHeader({ showHeadshot: e.target.checked })} />
                Show candidate headshot
              </label>
              {tpl.header.showHeadshot && !campaign.headshotMime && (
                <p className="text-xs text-muted-foreground">
                  No headshot uploaded yet — add one in{" "}
                  <Link href="/settings" className="underline">Settings</Link>.
                </p>
              )}
            </div>
          </section>

          {/* Theme */}
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Theme</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <ColorField label="Primary (headings)" value={tpl.theme.primaryColor} onChange={(v) => setTheme({ primaryColor: v })} />
              <ColorField label="Accent (buttons)" value={tpl.theme.accentColor} onChange={(v) => setTheme({ accentColor: v })} />
              <ColorField label="Background" value={tpl.theme.contentBg} onChange={(v) => setTheme({ contentBg: v })} />
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Font</span>
                <select value={tpl.theme.fontFamily} onChange={(e) => setTheme({ fontFamily: e.target.value as "sans" | "serif" })} className={inputCls}>
                  <option value="sans">Sans-serif</option>
                  <option value="serif">Serif</option>
                </select>
              </label>
            </div>
          </section>

          {/* Footer */}
          <section className="rounded-2xl border border-border bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Footer</h2>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Sign-off (optional)</span>
              <input value={tpl.footer.signoff} onChange={(e) => setFooter({ signoff: e.target.value })} placeholder="e.g. Thanks for reading — see you at the doors." className={inputCls} />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">Your committee name, mailing address, and an unsubscribe link are added automatically below this (legally required).</p>
          </section>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</> : saved ? <><Check className="mr-1.5 h-4 w-4" /> Saved</> : "Save template"}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview (sample issue)</p>
          <iframe title="Template preview" srcDoc={previewHtml} className="h-[70vh] w-full rounded-2xl border border-border bg-white" />
        </div>
      </div>
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">{label}</span>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-border" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      </div>
    </label>
  )
}
