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
  ChevronRight,
  ArrowRight,
  Inbox,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  updatePage,
  deletePage,
  addBlock,
  deleteBlock,
  moveBlock,
} from "@/app/website/blocks-actions"
import { aiSuggestLayoutAction, applyLayoutAction } from "@/app/website/ai-actions"
import { BLOCK_SPECS, blockSummary, type BlockType } from "@/lib/website/blocks"
import { BlockPropsForm, type EditorBlock } from "./BlockPropsForm"
import { BlockPalette, KindBadge } from "./BlockPalette"
import { PageManager } from "./PageManager"

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
  const [busy, startBusy] = useTransition()

  // Page selection (source of truth for lists = the server `site` prop).
  const pages = site.pages
  const homeId = pages.find((p) => p.isHome)?.id ?? pages[0]?.id
  const [selectedId, setSelectedId] = useState<string | undefined>(homeId)
  const selected = pages.find((p) => p.id === selectedId) ?? pages.find((p) => p.id === homeId) ?? pages[0]

  // Which section cards are expanded, and which "add section" slot (by index) is open.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [openSlot, setOpenSlot] = useState<number | null>(null)

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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

  // ── Pages ──
  function onDeletePage(p: EditorPage) {
    if (!confirm(`Delete the "${p.title}" page and its blocks?`)) return
    run(() => deletePage(p.id), () => setSelectedId(homeId))
  }

  // ── Blocks ──
  // Insert a section at `index`, then auto-expand it for immediate editing.
  function addAt(type: string, index: number) {
    if (!selected) return
    setError(null)
    startBusy(async () => {
      const res = await addBlock(selected.id, type, index)
      if (res.ok) {
        setOpenIds((prev) => new Set(prev).add(res.blockId))
        setOpenSlot(null)
        router.refresh()
      } else {
        setError(res.error ?? "Something went wrong.")
      }
    })
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
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* First-class page manager */}
        <PageManager
          pages={pages}
          selectedId={selected?.id}
          onSelect={setSelectedId}
          busy={busy}
          run={run}
          onDelete={onDeletePage}
        />

        {/* Selected page */}
        <div className="space-y-4">
          {selected && <PageSettings key={selected.id} page={selected} busy={busy} run={run} onDelete={onDeletePage} />}

          {selected && <LayoutSuggester key={`ls-${selected.id}`} page={selected} />}

          {selected && selected.blocks.length === 0 && openSlot === null && (
            <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-sm text-muted-foreground">
              This page has no sections yet. Add your first one below, or let AI suggest a layout above.
            </p>
          )}

          {/* Sections — collapsible cards, with an insert slot before each. */}
          {selected?.blocks.map((b, idx) => (
            <div key={b.id} className="space-y-4">
              <AddSectionSlot
                open={openSlot === idx}
                onOpen={() => setOpenSlot(idx)}
                onClose={() => setOpenSlot(null)}
                onPick={(t) => addAt(t, idx)}
                busy={busy}
              />
              <SectionCard
                block={b}
                idx={idx}
                count={selected.blocks.length}
                open={openIds.has(b.id)}
                onToggle={() => toggleOpen(b.id)}
                busy={busy}
                run={run}
                onSaved={() => router.refresh()}
              />
            </div>
          ))}

          {/* Add a section at the end (primary entry). */}
          {selected && (
            <AddSectionSlot
              open={openSlot === selected.blocks.length}
              onOpen={() => setOpenSlot(selected.blocks.length)}
              onClose={() => setOpenSlot(null)}
              onPick={(t) => addAt(t, selected.blocks.length)}
              busy={busy}
              primary
            />
          )}
        </div>
      </div>

      {/* Site theme, donate link, and contact email now live on their own page:
          /website/settings (reachable from the header + workspace links). */}

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
  const [slug, setSlug] = useState(page.slug)
  const titleDirty = title.trim() !== page.title && title.trim().length > 0
  const slugDirty = slug.trim() !== page.slug && slug.trim().length > 0

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

      {/* Public path — the home page always lives at the site root. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Path</span>
        {page.isHome ? (
          <code className="rounded bg-[#f4f6f9] px-2 py-1 text-xs text-muted-foreground">/ (home)</code>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={`${inputCls} max-w-50 py-1.5 font-mono text-xs`}
              placeholder="path"
            />
            {slugDirty && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => updatePage(page.id, { slug: slug.trim() }))}
              >
                Save path
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add-section slot ────────────────────────────────────────────────────────
// Collapsed: a trigger ("Add a section" at the end, a slim "Insert" between cards).
// Open: the grouped block palette, inserting at this slot's index.

function AddSectionSlot({
  open,
  onOpen,
  onClose,
  onPick,
  busy,
  primary,
}: {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (type: string) => void
  busy: boolean
  primary?: boolean
}) {
  if (open) {
    return (
      <div className="rounded-2xl border border-[#1b3a6b]/30 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1a1a2e]">Add a section</span>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-[#1a1a2e]">
            Cancel
          </button>
        </div>
        <BlockPalette onPick={onPick} disabled={busy} />
      </div>
    )
  }
  if (primary) {
    return (
      <button
        onClick={onOpen}
        disabled={busy}
        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border bg-white px-4 py-3 text-sm font-medium text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1a1a2e] disabled:opacity-50"
      >
        <Plus className="h-4 w-4" /> Add a section
      </button>
    )
  }
  return (
    <div className="flex justify-center">
      <button
        onClick={onOpen}
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-0.5 text-xs text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1a1a2e] disabled:opacity-50"
        title="Insert a section here"
      >
        <Plus className="h-3 w-3" /> Insert
      </button>
    </div>
  )
}

// ─── Section card ────────────────────────────────────────────────────────────
// A collapsible block: header (label, kind badge, summary, reorder/delete) + the
// props form when expanded.

function SectionCard({
  block,
  idx,
  count,
  open,
  onToggle,
  busy,
  run,
  onSaved,
}: {
  block: EditorBlock
  idx: number
  count: number
  open: boolean
  onToggle: () => void
  busy: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  onSaved: () => void
}) {
  const spec = BLOCK_SPECS[block.type as BlockType]
  const label = spec?.label ?? block.type
  const kind = spec?.kind ?? "content"
  const summary = blockSummary(block.type, block.props)

  return (
    <div className="rounded-2xl border border-border bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          />
          <span className="shrink-0 text-sm font-semibold text-[#1a1a2e]">{label}</span>
          <KindBadge kind={kind} />
          {!open && summary && <span className="truncate text-sm text-muted-foreground">— {summary}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => run(() => moveBlock(block.id, idx - 1))}
            disabled={idx === 0 || busy}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
            title="Move up"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            onClick={() => run(() => moveBlock(block.id, idx + 1))}
            disabled={idx === count - 1 || busy}
            className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
            title="Move down"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete the "${label}" section?`)) run(() => deleteBlock(block.id))
            }}
            disabled={busy}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            title="Delete section"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          <BlockPropsForm block={block} onSaved={onSaved} />
        </div>
      )}
    </div>
  )
}

// ─── AI: suggest a page's section layout ──────────────────────────────────────

type LayoutSug = { type: string; label: string; note: string }

function LayoutSuggester({ page }: { page: EditorPage }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [applying, startApply] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<LayoutSug[] | null>(null)
  const [picked, setPicked] = useState<Set<number>>(new Set())

  async function suggest() {
    setLoading(true)
    setError(null)
    const res = await aiSuggestLayoutAction({
      pageTitle: page.title,
      existingTypes: page.blocks.map((b) => b.type),
    })
    setLoading(false)
    if (res.ok) {
      setSuggestions(res.suggestions)
      setPicked(new Set(res.suggestions.map((_, i) => i)))
    } else {
      setError(res.error)
    }
  }

  function toggle(i: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function apply() {
    if (!suggestions) return
    const types = suggestions.filter((_, i) => picked.has(i)).map((s) => s.type)
    if (types.length === 0) return
    setError(null)
    startApply(async () => {
      const res = await applyLayoutAction(page.id, types)
      if (res.ok) {
        setSuggestions(null)
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-[#c4910a]/25 bg-[#c4910a]/5 p-4">
      {!suggestions ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="outline" onClick={suggest} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Thinking…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4 text-[#c4910a]" /> Suggest sections
              </>
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            Let AI propose a section layout for “{page.title}”, then add the ones you like.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#1a1a2e]">Suggested sections for “{page.title}”</span>
            <button
              onClick={() => setSuggestions(null)}
              className="text-xs text-muted-foreground hover:text-[#1a1a2e]"
            >
              Dismiss
            </button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions — the page looks complete.</p>
          ) : (
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/60">
                    <input
                      type="checkbox"
                      checked={picked.has(i)}
                      onChange={() => toggle(i)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="text-sm font-medium text-[#1a1a2e]">{s.label}</span>
                      {s.note && <span className="ml-1.5 text-xs text-muted-foreground">— {s.note}</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {suggestions.length > 0 && (
            <Button size="sm" onClick={apply} disabled={applying || picked.size === 0}>
              {applying ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…
                </>
              ) : (
                `Add ${picked.size} ${picked.size === 1 ? "section" : "sections"}`
              )}
            </Button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
