"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Home,
  Copy,
  Trash2,
  Check,
  X,
  Sparkles,
  Loader2,
} from "lucide-react"
import { createPage, setHomePage, duplicatePage, reorderPages } from "@/app/website/blocks-actions"
import { aiSuggestSitemapAction, createPageWithBlocksAction } from "@/app/website/ai-actions"
import { BLOCK_SPECS, type BlockType } from "@/lib/website/blocks"
import type { EditorPage } from "./WebsiteBuilder"

type RunFn = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => void

/**
 * First-class page manager — the spine of the structured builder. Lists the site's
 * pages and owns all page-level operations (add, reorder, set-home, duplicate,
 * delete). Selecting a page drives the block editor to its right.
 */
export function PageManager({
  pages,
  selectedId,
  onSelect,
  busy,
  run,
  onDelete,
}: {
  pages: EditorPage[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  busy: boolean
  run: RunFn
  onDelete: (p: EditorPage) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [menuFor, setMenuFor] = useState<string | null>(null)

  function submitAdd() {
    const title = newTitle.trim()
    if (!title) return
    run(
      () => createPage(title),
      () => {
        setNewTitle("")
        setAdding(false)
      }
    )
  }

  function movePage(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= pages.length) return
    const ids = pages.map((p) => p.id)
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    run(() => reorderPages(ids))
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pages</h2>
        <button
          onClick={() => {
            setAdding((v) => !v)
            setNewTitle("")
          }}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-[#1b3a6b]/40 hover:text-[#1a1a2e] disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <SitemapSuggester pages={pages} busy={busy} />


      {adding && (
        <div className="mb-3 flex items-center gap-1.5">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitAdd()
              if (e.key === "Escape") setAdding(false)
            }}
            placeholder="Page title"
            className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
          />
          <button
            onClick={submitAdd}
            disabled={busy || !newTitle.trim()}
            className="rounded-lg bg-[#1b3a6b] p-1.5 text-white hover:bg-[#16305a] disabled:opacity-40"
            title="Add page"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => setAdding(false)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ul className="space-y-1">
        {pages.map((p, idx) => (
          <li key={p.id} className="relative">
            <div
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                p.id === selectedId ? "bg-[#1b3a6b]/8" : "hover:bg-muted/50"
              }`}
            >
              <button onClick={() => onSelect(p.id)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5 truncate text-sm font-medium text-[#1a1a2e]">
                  {p.isHome && <Home className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <span className="truncate">{p.title}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate">{p.isHome ? "/" : `/${p.slug}`}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="shrink-0">
                    {p.blocks.length} {p.blocks.length === 1 ? "section" : "sections"}
                  </span>
                  {!p.published && <span className="shrink-0 text-[#c4910a]">· draft</span>}
                  {!p.showInNav && <span className="shrink-0">· hidden</span>}
                </span>
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
              <button
                onClick={() => setMenuFor((m) => (m === p.id ? null : p.id))}
                disabled={busy}
                className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                title="More"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </div>

            {menuFor === p.id && (
              <>
                {/* click-catcher to dismiss the menu */}
                <button
                  className="fixed inset-0 z-10 cursor-default"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMenuFor(null)}
                />
                <div className="absolute right-2 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
                  {!p.isHome && (
                    <MenuItem
                      icon={<Home className="h-4 w-4" />}
                      label="Set as home"
                      onClick={() => {
                        setMenuFor(null)
                        run(() => setHomePage(p.id))
                      }}
                    />
                  )}
                  <MenuItem
                    icon={<Copy className="h-4 w-4" />}
                    label="Duplicate"
                    onClick={() => {
                      setMenuFor(null)
                      run(() => duplicatePage(p.id))
                    }}
                  />
                  {!p.isHome && (
                    <MenuItem
                      icon={<Trash2 className="h-4 w-4" />}
                      label="Delete"
                      destructive
                      onClick={() => {
                        setMenuFor(null)
                        onDelete(p)
                      }}
                    />
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/60 ${
        destructive ? "text-red-600 hover:bg-red-50" : "text-[#1a1a2e]"
      }`}
    >
      <span className="text-muted-foreground">{icon}</span>
      {label}
    </button>
  )
}

// ─── AI: suggest pages (sitemap) ──────────────────────────────────────────────

type PageSug = { title: string; purpose: string; blocks: string[] }

function SitemapSuggester({ pages, busy }: { pages: EditorPage[]; busy: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [adding, startAdd] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<PageSug[] | null>(null)

  async function suggest() {
    setLoading(true)
    setError(null)
    const res = await aiSuggestSitemapAction({ existingTitles: pages.map((p) => p.title) })
    setLoading(false)
    if (res.ok) setSuggestions(res.suggestions)
    else setError(res.error)
  }

  function addPage(sug: PageSug) {
    setError(null)
    startAdd(async () => {
      const res = await createPageWithBlocksAction(sug.title, sug.blocks)
      if (res.ok) {
        setSuggestions((prev) => (prev ? prev.filter((s) => s !== sug) : prev))
        router.refresh()
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <div className="mb-3">
      {!suggestions ? (
        <button
          onClick={suggest}
          disabled={loading || busy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#c4910a]/30 bg-[#c4910a]/5 px-2 py-1.5 text-xs font-medium text-[#8a6608] hover:bg-[#c4910a]/10 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Suggest pages
            </>
          )}
        </button>
      ) : (
        <div className="rounded-lg border border-[#c4910a]/25 bg-[#c4910a]/5 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1a1a2e]">Suggested pages</span>
            <button
              onClick={() => setSuggestions(null)}
              className="text-xs text-muted-foreground hover:text-[#1a1a2e]"
            >
              Dismiss
            </button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No new pages to suggest.</p>
          ) : (
            <ul className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="rounded-lg border border-border bg-white p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[#1a1a2e]">{s.title}</div>
                      {s.purpose && <div className="mt-0.5 text-xs text-muted-foreground">{s.purpose}</div>}
                    </div>
                    <button
                      onClick={() => addPage(s)}
                      disabled={adding}
                      className="shrink-0 rounded-lg bg-[#1b3a6b] px-2 py-1 text-xs font-medium text-white hover:bg-[#16305a] disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                  {s.blocks.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.blocks.map((b, k) => (
                        <span
                          key={k}
                          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {BLOCK_SPECS[b as BlockType]?.label ?? b}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
