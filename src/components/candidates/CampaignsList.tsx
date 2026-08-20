"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Megaphone, Check, Plus, Loader2, Trash2, AlertTriangle, X } from "lucide-react"
import { setActiveCampaign } from "@/app/actions/committee"
import { removeCampaign } from "@/app/candidates/actions"

export interface CampaignCard {
  id: string
  cycle: number
  office: string
  party: string | null
}

export function CampaignsList({
  campaigns,
  activeId,
  canManage,
}: {
  campaigns: CampaignCard[]
  activeId: string | null
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<CampaignCard | null>(null)

  function open(id: string) {
    if (id === activeId) {
      router.push("/dashboard")
      return
    }
    setBusyId(id)
    startTransition(async () => {
      await setActiveCampaign(id)
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {campaigns.map((c) => {
          const isActive = c.id === activeId
          const busy = busyId === c.id && pending
          return (
            <div
              key={c.id}
              className={`relative flex items-start gap-3 rounded-2xl border bg-white p-5 transition-colors ${
                isActive ? "border-[#1b3a6b] ring-1 ring-[#1b3a6b]/20" : "border-border hover:border-[#1b3a6b]/40"
              } ${pending ? "opacity-60" : ""}`}
            >
              <button onClick={() => open(c.id)} disabled={pending} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b3a6b]/8 text-[#1b3a6b]">
                  <Megaphone className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-[#1a1a2e]">{c.cycle}</span>
                    {isActive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1e6b3a]/10 px-2 py-0.5 text-xs font-semibold text-[#1e6b3a]">
                        <Check className="h-3 w-3" /> Current
                      </span>
                    )}
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {[c.office, c.party].filter(Boolean).join(" · ") || "Run"}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#1b3a6b]">
                    {isActive ? "Current run" : "Switch to this run"}
                  </span>
                </span>
              </button>
              {canManage && (
                <button
                  onClick={() => setConfirming(c)}
                  disabled={pending}
                  title={`Remove the ${c.cycle} campaign`}
                  aria-label={`Remove the ${c.cycle} campaign`}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}

        {canManage && (
          <Link
            href="/campaigns/new"
            className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/50 p-5 text-sm font-semibold text-[#1b3a6b] transition-colors hover:border-[#1b3a6b]/50 hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Add campaign
          </Link>
        )}
      </div>

      {confirming && (
        <RemoveDialog
          campaign={confirming}
          onClose={() => setConfirming(null)}
          onRemoved={() => {
            setConfirming(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

function RemoveDialog({
  campaign,
  onClose,
  onRemoved,
}: {
  campaign: CampaignCard
  onClose: () => void
  onRemoved: () => void
}) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    setError(null)
    start(async () => {
      const res = await removeCampaign(campaign.id)
      if (!res.ok) return setError(res.error)
      onRemoved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#1a1a2e]">Remove campaign</h2>
              <p className="text-sm text-muted-foreground">{campaign.cycle} · {campaign.office}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-[#1a1a2e]">
            This permanently removes the <span className="font-semibold">{campaign.cycle}</span> run and everything tied to
            it — this run&rsquo;s communications, news, and newsletters. This can&rsquo;t be undone.
          </p>
          {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button onClick={onClose} disabled={pending} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-[#1a1a2e] transition-colors hover:bg-muted disabled:opacity-50">
            Cancel
          </button>
          <button onClick={confirm} disabled={pending} className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Remove campaign
          </button>
        </div>
      </div>
    </div>
  )
}
