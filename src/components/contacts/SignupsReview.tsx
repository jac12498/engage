"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Check, X, Trash2, Mail, Phone, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { acceptSignup, rejectSignup, deleteSignup } from "@/app/contacts/signups/actions"

export interface SignupRow {
  id: string
  name: string
  email: string
  phone: string | null
  message: string | null
  status: string
  createdAt: string
  reviewedAt: string | null
  contactId: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
] as const
type TabKey = (typeof TABS)[number]["key"]

export function SignupsReview({ signups }: { signups: SignupRow[] }) {
  const [tab, setTab] = useState<TabKey>("pending")
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const m: Record<string, number> = { pending: 0, accepted: 0, rejected: 0 }
    for (const s of signups) m[s.status] = (m[s.status] ?? 0) + 1
    return m
  }, [signups])

  const shown = signups.filter((s) => s.status === tab)

  return (
    <div>
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to contacts
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Volunteer signups</h1>
        <p className="mt-1 text-muted-foreground">
          Review signups from your website. Accept to add them to your contacts, or reject spam.
        </p>
      </div>

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
            <span className={tab === t.key ? "text-white/70" : "text-muted-foreground/70"}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((s) => (
            <SignupCard key={s.id} signup={s} onError={setError} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: TabKey }) {
  const copy =
    tab === "pending"
      ? "No signups waiting for review. New ones from your website will appear here."
      : tab === "accepted"
        ? "No accepted signups yet."
        : "No rejected signups."
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  )
}

function SignupCard({
  signup,
  onError,
}: {
  signup: SignupRow
  onError: (msg: string | null) => void
}) {
  const [isPending, startTransition] = useTransition()

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    onError(null)
    startTransition(async () => {
      const res = await fn()
      if (!res.ok) onError(res.error ?? "Something went wrong.")
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-semibold text-[#1a1a2e]">{signup.name}</div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <a href={`mailto:${signup.email}`} className="inline-flex items-center gap-1.5 hover:text-[#1b3a6b]">
              <Mail className="h-3.5 w-3.5" />
              {signup.email}
            </a>
            {signup.phone && (
              <a href={`tel:${signup.phone}`} className="inline-flex items-center gap-1.5 hover:text-[#1b3a6b]">
                <Phone className="h-3.5 w-3.5" />
                {signup.phone}
              </a>
            )}
          </div>
          {signup.message && (
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2 text-sm text-[#333]">
              {signup.message}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Submitted {formatDate(signup.createdAt)}
            {signup.reviewedAt ? ` · reviewed ${formatDate(signup.reviewedAt)}` : ""}
          </p>
        </div>

        {/* Actions per status */}
        <div className="flex shrink-0 items-center gap-2">
          {signup.status === "pending" && (
            <>
              <Button onClick={() => run(() => acceptSignup(signup.id))} disabled={isPending}>
                <Check className="mr-1.5 h-4 w-4" />
                Accept
              </Button>
              <button
                onClick={() => run(() => rejectSignup(signup.id))}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Reject
              </button>
            </>
          )}

          {signup.status === "accepted" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1e6b3a]/10 px-3 py-1 text-xs font-semibold text-[#1e6b3a]">
              <Check className="h-3.5 w-3.5" />
              Added to contacts
            </span>
          )}

          {signup.status === "rejected" && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a1a2e]/6 px-3 py-1 text-xs font-medium text-muted-foreground">
                Rejected
              </span>
              <button
                onClick={() => {
                  if (confirm("Permanently delete this signup?")) run(() => deleteSignup(signup.id))
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
