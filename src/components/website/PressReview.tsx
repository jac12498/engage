"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Inbox,
  ExternalLink,
  Search,
  Plus,
  Loader2,
  Newspaper,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  findPressCoverage,
  addPressClipByUrl,
  approveClip,
  rejectClip,
  deleteClip,
} from "@/app/website/(app)/press/actions"

export interface PressRow {
  id: string
  headline: string
  url: string
  outlet: string | null
  summary: string | null
  publishedAt: string | null
  source: string
  status: string
  createdAt: string
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
] as const
type TabKey = (typeof TABS)[number]["key"]

export function PressReview({ clips }: { clips: PressRow[] }) {
  const [tab, setTab] = useState<TabKey>("pending")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [keywords, setKeywords] = useState("")
  const [url, setUrl] = useState("")
  const [finding, startFinding] = useTransition()
  const [adding, startAdding] = useTransition()

  const counts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const c of clips) m[c.status] = (m[c.status] ?? 0) + 1
    return m
  }, [clips])

  const shown = clips.filter((c) => c.status === tab)

  function find() {
    setError(null)
    setNotice(null)
    startFinding(async () => {
      const res = await findPressCoverage(keywords.trim() || undefined)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setTab("pending")
      setNotice(
        res.found === 0
          ? "No new coverage found this time. Try again later, or add a link below."
          : res.added === 0
            ? `Found ${res.found} article${res.found === 1 ? "" : "s"} — all already in your queue.`
            : `Added ${res.added} new clip${res.added === 1 ? "" : "s"} to review (from ${res.found} found).`,
      )
    })
  }

  function add() {
    const link = url.trim()
    if (!link) return
    setError(null)
    setNotice(null)
    startAdding(async () => {
      const res = await addPressClipByUrl(link)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setUrl("")
      setTab("approved")
      setNotice("Added to your press coverage.")
    })
  }

  return (
    <div>
      <Link
        href="/website"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to website
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Press coverage</h1>
        <p className="mt-1 text-muted-foreground">
          Find news coverage about your campaign, review it, and approve the pieces to show in your website&apos;s
          &ldquo;In the news&rdquo; section.
        </p>
      </div>

      {/* Discovery + manual add */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-semibold text-[#1a1a2e]">
              <Newspaper className="h-4 w-4 text-[#1b3a6b]" />
              Find coverage
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Search the web for recent articles that mention your candidacy. Results land in Pending for your review.
            </p>
          </div>
          <Button onClick={find} disabled={finding}>
            {finding ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Search className="mr-1.5 h-4 w-4" />}
            {finding ? "Searching…" : "Find coverage"}
          </Button>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-medium text-[#1a1a2e]">Focus terms (optional)</span>
          <input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                find()
              }
            }}
            placeholder="Topics, issues, or outlets to focus on — e.g. Fair Taxes Act, Woodstock, Daily Freeman"
            disabled={finding}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15 disabled:opacity-60"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Leave blank for a general search. Terms help surface additional coverage — they don&apos;t restrict it.
          </span>
        </label>

        <div className="mt-4 border-t border-border pt-4">
          <span className="text-sm font-medium text-[#1a1a2e]">Or add a specific article by link</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  add()
                }
              }}
              placeholder="https://example-news.com/article"
              disabled={adding}
              className="min-w-0 flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15 disabled:opacity-60"
            />
            <button
              onClick={add}
              disabled={adding || !url.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/40 hover:bg-muted/40 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-[#1e6b3a]/25 bg-[#1e6b3a]/8 px-4 py-2.5 text-sm text-[#1e6b3a]">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-[#1b3a6b] bg-[#1b3a6b] text-white"
                : "border-border bg-white text-muted-foreground hover:border-[#1b3a6b]/40"
            }`}
          >
            {t.label}
            <span className={tab === t.key ? "text-white/70" : "text-muted-foreground/70"}>{counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((c) => (
            <ClipCard key={c.id} clip={c} onError={setError} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: TabKey }) {
  const copy =
    tab === "pending"
      ? "No coverage waiting for review. Use “Find coverage” above to search for articles about your campaign."
      : tab === "approved"
        ? "No approved coverage yet. Approve pending clips to show them on your site."
        : "No rejected coverage."
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  )
}

function ClipCard({ clip, onError }: { clip: PressRow; onError: (msg: string | null) => void }) {
  const [isPending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    onError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) onError(res.error ?? "Something went wrong.")
    })
  }

  const meta = [clip.outlet, clip.publishedAt ? formatDay(clip.publishedAt) : null].filter(Boolean).join(" · ")

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {meta && <p className="text-xs uppercase tracking-wider text-muted-foreground">{meta}</p>}
          <a
            href={clip.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-start gap-1.5 font-semibold text-[#1a1a2e] hover:text-[#1b3a6b]"
          >
            {clip.headline}
            <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </a>
          {clip.summary && <p className="mt-2 text-sm leading-relaxed text-[#444]">{clip.summary}</p>}
          <p className="mt-2 truncate text-xs text-muted-foreground">{clip.url}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {clip.status === "pending" && (
            <>
              <Button onClick={() => run(() => approveClip(clip.id))} disabled={isPending}>
                <Check className="mr-1.5 h-4 w-4" />
                Approve
              </Button>
              <button
                onClick={() => run(() => rejectClip(clip.id))}
                disabled={isPending}
                title="Hide from your site, but keep a record (won't resurface in future searches)"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this clip? It's removed from your queue. (Reject instead if you want to be sure it never comes back in a future search.)"))
                    run(() => deleteClip(clip.id))
                }}
                disabled={isPending}
                title="Not the right person / not real coverage — delete it from the queue"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Not relevant
              </button>
            </>
          )}

          {clip.status === "approved" && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1e6b3a]/10 px-3 py-1 text-xs font-semibold text-[#1e6b3a]">
                <Check className="h-3.5 w-3.5" />
                On your site
              </span>
              <button
                onClick={() => run(() => rejectClip(clip.id))}
                disabled={isPending}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Remove from site"
                title="Remove from site"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}

          {clip.status === "rejected" && (
            <>
              <button
                onClick={() => run(() => approveClip(clip.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-[#1b3a6b]/40 hover:text-[#1b3a6b] disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Approve
              </button>
              <button
                onClick={() => {
                  if (confirm("Permanently delete this clip?")) run(() => deleteClip(clip.id))
                }}
                disabled={isPending}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Delete permanently"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
