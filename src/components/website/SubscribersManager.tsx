"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Trash2, Inbox, Users } from "lucide-react"
import { deleteSubscriber } from "@/app/newsletters/subscribers/actions"

export interface SubscriberRow {
  id: string
  email: string
  name: string | null
  status: string
  source: string
  createdAt: string
  confirmedAt: string | null
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

const TABS = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "unsubscribed", label: "Unsubscribed" },
] as const
type TabKey = (typeof TABS)[number]["key"]

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#1e6b3a]/10 text-[#1e6b3a]",
  pending: "bg-[#c4910a]/15 text-[#7a5a00]",
  unsubscribed: "bg-[#1a1a2e]/6 text-muted-foreground",
}

export function SubscribersManager({
  subscribers,
  subscriberLimit = null,
}: {
  subscribers: SubscriberRow[]
  subscriberLimit?: number | null
}) {
  const [tab, setTab] = useState<TabKey>("active")
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const m: Record<string, number> = { active: 0, pending: 0, unsubscribed: 0 }
    for (const s of subscribers) m[s.status] = (m[s.status] ?? 0) + 1
    return m
  }, [subscribers])

  // What counts against the free-tier cap: everyone still on the list (active + pending).
  const listSize = counts.active + counts.pending
  const atCap = subscriberLimit != null && listSize >= subscriberLimit

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subscribers.filter(
      (s) => s.status === tab && (!q || s.email.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q)),
    )
  }, [subscribers, tab, query])

  return (
    <div>
      <Link
        href="/newsletters"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to newsletters
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Newsletter subscribers</h1>
          <p className="mt-1 text-muted-foreground">
            People who signed up on your website. Only <span className="font-medium text-[#1e6b3a]">Active</span>{" "}
            (confirmed) subscribers receive the newsletter.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5">
          <Users className="h-4 w-4 text-[#1b3a6b]" />
          <span className="text-sm">
            <span className="font-semibold text-[#1a1a2e]">{counts.active}</span> active
            {subscriberLimit != null && (
              <span className="text-muted-foreground">
                {" · "}
                <span className={atCap ? "font-semibold text-[#c4910a]" : ""}>
                  {listSize}/{subscriberLimit}
                </span>{" "}
                on your plan
              </span>
            )}
          </span>
        </div>
      </div>

      {atCap && (
        <p className="mt-4 rounded-lg border border-[#c4910a]/30 bg-[#f0b429]/10 px-4 py-2.5 text-sm text-[#7a5a00]">
          You&apos;ve reached your plan&apos;s {subscriberLimit}-subscriber limit — new sign-ups are paused. Upgrade to
          Campaign for an unlimited list.
        </p>
      )}

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
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
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search email or name…"
          className="ml-auto w-56 rounded-lg border border-border bg-white px-3 py-1.5 text-sm outline-none focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"
        />
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {shown.length === 0 ? (
        <EmptyState tab={tab} hasQuery={!!query.trim()} />
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <SubscriberRowView key={s.id} sub={s} onError={setError} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab, hasQuery }: { tab: TabKey; hasQuery: boolean }) {
  const copy = hasQuery
    ? "No subscribers match your search."
    : tab === "active"
      ? "No confirmed subscribers yet. Add a Newsletter signup block to your site — visitors who sign up and confirm will show here."
      : tab === "pending"
        ? "No one is waiting to confirm. Pending signups appear here until they click the confirmation link."
        : "No unsubscribes."
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border bg-white/60 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">{copy}</p>
    </div>
  )
}

function SubscriberRowView({ sub, onError }: { sub: SubscriberRow; onError: (msg: string | null) => void }) {
  const [isPending, startTransition] = useTransition()

  function remove() {
    if (!confirm("Permanently delete this subscriber?")) return
    onError(null)
    startTransition(async () => {
      const res = await deleteSubscriber(sub.id)
      if (!res.ok) onError(res.error)
    })
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium text-[#1a1a2e]">{sub.email}</td>
      <td className="px-4 py-3 text-muted-foreground">{sub.name || "—"}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
            STATUS_STYLE[sub.status] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {sub.status}
        </span>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formatDay(sub.createdAt)}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={remove}
          disabled={isPending}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label="Delete subscriber"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}
