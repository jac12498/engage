"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ArrowRight,
  Inbox,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { regenerateSite, setPublished } from "@/app/website/actions"
import {
  updateSiteSettings,
  createPage,
  updatePage,
  deletePage,
  reorderPages,
  addBlock,
  deleteBlock,
  moveBlock,
} from "@/app/website/blocks-actions"
import { BLOCK_ORDER, BLOCK_SPECS } from "@/lib/website/blocks"
import { BlockPropsForm, type EditorBlock } from "./BlockPropsForm"

export interface EditorPage {
  id: string
  slug: string
  title: string
  navOrder: number
  showInNav: boolean
  published: boolean
  isHome: boolean
  blocks: EditorBlock[]
}
export interface EditorSite {
  published: boolean
  primaryColor: string
  accentColor: string
  fontTheme: string
  donateUrl: string
  contactEmail: string
  pages: EditorPage[]
}

const inputCls =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

const FONT_THEMES = [
  { id: "classic", label: "Classic (sans-serif)" },
  { id: "modern", label: "Modern (geometric)" },
  { id: "serif", label: "Serif (traditional)" },
]

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  )
}

export function WebsiteBuilder({
  campaignId,
  hasHeadshot: initialHasHeadshot,
  site,
  pendingSignups,
}: {
  campaignId: string
  hasHeadshot: boolean
  site: EditorSite
  pendingSignups: number
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")
  const [copied, setCopied] = useState(false)
  const [publishing, startPublishing] = useTransition()
  const [regenerating, startRegen] = useTransition()
  const [busy, startBusy] = useTransition()

  useEffect(() => setOrigin(window.location.origin), [])
  const publicUrl = `${origin}/websites/${campaignId}`

  // Page selection (source of truth for lists = the server `site` prop).
  const pages = site.pages
  const homeId = pages.find((p) => p.isHome)?.id ?? pages[0]?.id
  const [selectedId, setSelectedId] = useState<string | undefined>(homeId)
  const selected = pages.find((p) => p.id === selectedId) ?? pages.find((p) => p.id === homeId) ?? pages[0]

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null)
    startBusy(async () => {
      const res = await fn()
      if (res.ok) {
        router.refresh()
        after?.()
      } else {
        setError(res.error ?? "Something went wrong.")
      }
    })
  }

  // ── Publish ──
  function togglePublish() {
    const next = !site.published
    setError(null)
    startPublishing(async () => {
      const res = await setPublished(next)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  function regenerate() {
    if (
      !confirm(
        "Re-draft the home page from your profile? This replaces the home page's blocks (theme, links, other pages, and publish status are kept)."
      )
    )
      return
    setError(null)
    startRegen(async () => {
      const res = await regenerateSite()
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // ── Pages ──
  function onAddPage() {
    run(() => createPage("New page"))
  }
  function onDeletePage(p: EditorPage) {
    if (!confirm(`Delete the "${p.title}" page and its blocks?`)) return
    run(() => deletePage(p.id), () => setSelectedId(homeId))
  }
  function movePage(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= pages.length) return
    const ids = pages.map((p) => p.id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    run(() => reorderPages(ids))
  }

  // ── Blocks ──
  function onAddBlock(type: string) {
    if (!selected) return
    run(() => addBlock(selected.id, type))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Candidate Website</h1>
          <p className="mt-1 text-muted-foreground">Build your pages from blocks, then publish.</p>
        </div>
        {busy && <Loader2 className="mt-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {/* Publish bar */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${site.published ? "bg-[#1e6b3a]" : "bg-muted-foreground/40"}`}
              />
              <span className="font-semibold text-[#1a1a2e]">
                {site.published ? "Live" : "Draft — not public yet"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-[#f4f6f9] px-2 py-1 text-xs text-muted-foreground">{publicUrl}</code>
              <button onClick={copyUrl} className="text-muted-foreground hover:text-[#1a1a2e]" title="Copy URL">
                {copied ? <Check className="h-4 w-4 text-[#1e6b3a]" /> : <Copy className="h-4 w-4" />}
              </button>
              {site.published && (
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#c4910a] hover:underline"
                >
                  View live <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <Button variant={site.published ? "outline" : "default"} onClick={togglePublish} disabled={publishing}>
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : site.published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      {/* Pages + blocks */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Page list */}
        <div className="rounded-2xl border border-border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pages</h2>
            <button
              onClick={onAddPage}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1a1a2e]"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <ul className="space-y-1">
            {pages.map((p, idx) => (
              <li key={p.id}>
                <div
                  className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                    p.id === selected?.id ? "bg-[#1b3a6b]/8" : "hover:bg-muted/50"
                  }`}
                >
                  <button onClick={() => setSelectedId(p.id)} className="flex-1 truncate text-left text-sm">
                    <span className="inline-flex items-center gap-1.5 font-medium text-[#1a1a2e]">
                      {p.isHome && <Home className="h-3.5 w-3.5 text-muted-foreground" />}
                      {p.title}
                    </span>
                    {!p.published && <span className="ml-1 text-xs text-muted-foreground">· draft</span>}
                  </button>
                  <button
                    onClick={() => movePage(idx, -1)}
                    disabled={idx === 0 || busy}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => movePage(idx, 1)}
                    disabled={idx === pages.length - 1 || busy}
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Selected page */}
        <div className="space-y-4">
          {selected && <PageSettings key={selected.id} page={selected} busy={busy} run={run} onDelete={onDeletePage} />}

          {/* Blocks */}
          {selected?.blocks.map((b, idx) => (
            <div key={b.id} className="rounded-2xl border border-border bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-[#1a1a2e]">
                  {BLOCK_SPECS[b.type as keyof typeof BLOCK_SPECS]?.label ?? b.type}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => run(() => moveBlock(b.id, idx - 1))}
                    disabled={idx === 0 || busy}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => run(() => moveBlock(b.id, idx + 1))}
                    disabled={idx === selected.blocks.length - 1 || busy}
                    className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => run(() => deleteBlock(b.id))}
                    disabled={busy}
                    className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    title="Delete block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <BlockPropsForm block={b} onSaved={() => router.refresh()} />
            </div>
          ))}

          {selected && selected.blocks.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
              This page has no blocks yet. Add one below.
            </p>
          )}

          {/* Add-block palette */}
          {selected && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {BLOCK_ORDER.map((t) => (
                  <button
                    key={t}
                    onClick={() => onAddBlock(t)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-[#1a1a2e] hover:border-[#1b3a6b]/40 hover:bg-muted/40 disabled:opacity-50"
                    title={BLOCK_SPECS[t].description}
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    {BLOCK_SPECS[t].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Site settings */}
      <SiteSettings campaignId={campaignId} site={site} hasHeadshot={initialHasHeadshot} onError={setError} />

      {/* Regenerate */}
      <Card title="Start over">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-sm text-muted-foreground">
            Re-draft the home page from your latest profile. Your theme, links, other pages, and publish status
            stay put.
          </p>
          <Button variant="outline" onClick={regenerate} disabled={regenerating}>
            {regenerating ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Regenerating…
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate home page
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Volunteer signups → managed in the CRM */}
      <Card title="Volunteer signups">
        <p className="text-sm text-muted-foreground">
          Signups from your volunteer form are reviewed in your contacts, where you can accept them into your CRM
          or reject spam.
        </p>
        <Link
          href="/contacts/signups"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-[#1b3a6b]/40 hover:bg-muted/40"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a2e]">
            <Inbox className="h-4 w-4 text-[#1b3a6b]" />
            {pendingSignups > 0
              ? `${pendingSignups} ${pendingSignups === 1 ? "signup" : "signups"} waiting for review`
              : "Review volunteer signups"}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#1b3a6b]">
            Open
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </Card>
    </div>
  )
}

// ─── Page settings bar ───────────────────────────────────────────────────────

function PageSettings({
  page,
  busy,
  run,
  onDelete,
}: {
  page: EditorPage
  busy: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  onDelete: (p: EditorPage) => void
}) {
  const [title, setTitle] = useState(page.title)
  const titleDirty = title.trim() !== page.title && title.trim().length > 0

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputCls} max-w-xs font-medium`}
          placeholder="Page title"
        />
        {titleDirty && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => updatePage(page.id, { title: title.trim() }))}>
            Save title
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => run(() => updatePage(page.id, { published: !page.published }))}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-[#1a1a2e] hover:bg-muted/40"
            title={page.published ? "Published — click to make draft" : "Draft — click to publish"}
          >
            <span className={`inline-flex h-2 w-2 rounded-full ${page.published ? "bg-[#1e6b3a]" : "bg-muted-foreground/40"}`} />
            {page.published ? "Published" : "Draft"}
          </button>
          <button
            onClick={() => run(() => updatePage(page.id, { showInNav: !page.showInNav }))}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-[#1a1a2e] hover:bg-muted/40"
            title={page.showInNav ? "Shown in nav" : "Hidden from nav"}
          >
            {page.showInNav ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {page.showInNav ? "In nav" : "Hidden"}
          </button>
          {!page.isHome && (
            <button
              onClick={() => onDelete(page)}
              disabled={busy}
              className="rounded-lg border border-border p-1.5 text-muted-foreground hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              title="Delete page"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Site settings (theme + headshot + links) ────────────────────────────────

function SiteSettings({
  campaignId,
  site,
  hasHeadshot: initialHasHeadshot,
  onError,
}: {
  campaignId: string
  site: EditorSite
  hasHeadshot: boolean
  onError: (e: string | null) => void
}) {
  const router = useRouter()
  const [primaryColor, setPrimary] = useState(site.primaryColor)
  const [accentColor, setAccent] = useState(site.accentColor)
  const [fontTheme, setFont] = useState(site.fontTheme)
  const [donateUrl, setDonate] = useState(site.donateUrl)
  const [contactEmail, setEmail] = useState(site.contactEmail)
  const [saving, startSaving] = useTransition()
  const [saved, setSaved] = useState(false)

  const [hasHeadshot, setHasHeadshot] = useState(initialHasHeadshot)
  const [headshotVersion, setHeadshotVersion] = useState(0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function saveSettings() {
    onError(null)
    startSaving(async () => {
      const res = await updateSiteSettings({ primaryColor, accentColor, fontTheme, donateUrl, contactEmail })
      if (res.ok) {
        setSaved(true)
        router.refresh()
        setTimeout(() => setSaved(false), 1500)
      } else {
        onError(res.error)
      }
    })
  }

  async function onHeadshotChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    onError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/website/headshot", { method: "POST", body: fd })
      if (res.ok) {
        setHasHeadshot(true)
        setHeadshotVersion((v) => v + 1)
        router.refresh()
      } else onError((await res.text()) || "Upload failed.")
    } catch {
      onError("Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  async function removeHeadshot() {
    onError(null)
    setUploading(true)
    try {
      const res = await fetch("/api/website/headshot", { method: "DELETE" })
      if (res.ok) {
        setHasHeadshot(false)
        setHeadshotVersion((v) => v + 1)
        router.refresh()
      } else onError((await res.text()) || "Couldn't remove the photo.")
    } catch {
      onError("Couldn't remove the photo.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card title="Site settings">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Primary color</span>
          <div className="flex items-center gap-2">
            <input type="color" value={primaryColor} onChange={(e) => setPrimary(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-border" />
            <input value={primaryColor} onChange={(e) => setPrimary(e.target.value)} className={inputCls} />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Accent color</span>
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => setAccent(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-border" />
            <input value={accentColor} onChange={(e) => setAccent(e.target.value)} className={inputCls} />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Font style</span>
          <select value={fontTheme} onChange={(e) => setFont(e.target.value)} className={inputCls}>
            {FONT_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Headshot</span>
          <div className="flex items-center gap-4">
            {hasHeadshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/website/headshot/${campaignId}?v=${headshotVersion}`}
                alt="Candidate headshot"
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onHeadshotChange} className="hidden" />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasHeadshot ? "Replace" : "Upload"}
              </Button>
              {hasHeadshot && (
                <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={removeHeadshot}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Donate link</span>
          <input value={donateUrl} onChange={(e) => setDonate(e.target.value)} placeholder="https://secure.actblue.com/…" className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Contact email</span>
          <input value={contactEmail} onChange={(e) => setEmail(e.target.value)} placeholder="hello@campaign.org" className={inputCls} />
        </label>
      </div>
      <div className="mt-4">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
            </>
          ) : saved ? (
            <>
              <Check className="mr-1.5 h-4 w-4" /> Saved
            </>
          ) : (
            "Save settings"
          )}
        </Button>
      </div>
    </Card>
  )
}
