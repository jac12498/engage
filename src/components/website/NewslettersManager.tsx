"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Plus, Loader2, Mail, FileText, Inbox, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createNewsletter } from "@/app/newsletters/actions"
import { BUILTIN_PRESETS } from "@/lib/newsletter/presets"

export interface NewsletterRow {
  id: string
  subject: string
  status: string
  updatedAt: string
  publishedAt: string | null
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function NewslettersManager({
  newsletters,
  activeSubscribers,
  presets,
}: {
  newsletters: NewsletterRow[]
  activeSubscribers: number
  presets: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [creating, startCreating] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  function create(presetKey?: string) {
    setMenuOpen(false)
    setError(null)
    startCreating(async () => {
      const res = await createNewsletter(presetKey)
      if (res.ok) router.push(`/newsletters/${res.id}`)
      else setError(res.error)
    })
  }

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to workspace
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Newsletters</h1>
          <p className="mt-1 text-muted-foreground">
            Write and publish newsletter updates, then email them to your subscribers.
          </p>
          <Link
            href="/newsletters/subscribers"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b] hover:underline"
          >
            <Mail className="h-4 w-4" />
            {activeSubscribers} active subscriber{activeSubscribers === 1 ? "" : "s"}
          </Link>
        </div>
        <div className="relative">
          <Button onClick={() => setMenuOpen((v) => !v)} disabled={creating}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            New newsletter
            <ChevronDown className="ml-1.5 h-4 w-4" />
          </Button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
                <MenuItem label="Blank newsletter" onClick={() => create()} />
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start from a template</p>
                {BUILTIN_PRESETS.map((p) => (
                  <MenuItem key={p.key} label={p.name} sub={p.description} onClick={() => create(`builtin:${p.key}`)} />
                ))}
                {presets.length > 0 && (
                  <>
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your templates</p>
                    {presets.map((p) => (
                      <MenuItem key={p.id} label={p.name} onClick={() => create(`saved:${p.id}`)} />
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {newsletters.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            No newsletters yet. Create your first one — you can draft it with AI, then publish it to your archive.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {newsletters.map((n) => (
            <Link
              key={n.id}
              href={`/newsletters/${n.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-[#1b3a6b]/40"
            >
              <div className="flex min-w-0 items-start gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#1b3a6b]" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[#1a1a2e]">{n.subject || "Untitled newsletter"}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {n.status === "published" && n.publishedAt
                      ? `Published ${formatDay(n.publishedAt)}`
                      : `Edited ${formatDay(n.updatedAt)}`}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                    n.status === "published" ? "bg-[#1e6b3a]/10 text-[#1e6b3a]" : "bg-[#c4910a]/15 text-[#7a5a00]"
                  }`}
                >
                  {n.status}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, sub, onClick }: { label: string; sub?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full px-3 py-2 text-left transition-colors hover:bg-muted">
      <span className="block text-sm font-medium text-[#1a1a2e]">{label}</span>
      {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
    </button>
  )
}
