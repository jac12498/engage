"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  ArrowRight,
  Inbox,
  Eye,
  EyeOff,
  Home,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { regenerateSite } from "@/app/website/actions"
import {
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


function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </div>
  )
}

export function WebsiteBuilder({
  site,
  pendingSignups,
}: {
  site: EditorSite
  pendingSignups: number
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [regenerating, startRegen] = useTransition()
  const [busy, startBusy] = useTransition()

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
      {busy && (
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

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

      {/* Site theme, donate link, and contact email now live on their own page:
          /website/settings (reachable from the header + workspace links). */}

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
