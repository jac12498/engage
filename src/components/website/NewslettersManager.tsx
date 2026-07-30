"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Plus, Loader2, Mail, FileText, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createNewsletter } from "@/app/newsletters/actions"

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
}: {
  newsletters: NewsletterRow[]
  activeSubscribers: number
}) {
  const router = useRouter()
  const [creating, startCreating] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function create() {
    setError(null)
    startCreating(async () => {
      const res = await createNewsletter()
      if (res.ok) router.push(`/newsletters/${res.id}`)
      else setError(res.error)
    })
  }

  return (
    <div>
      <Link
        href="/"
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
        <Button onClick={create} disabled={creating}>
          {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          New newsletter
        </Button>
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
