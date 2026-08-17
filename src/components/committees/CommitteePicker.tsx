"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2, Check, Plus, Loader2, Megaphone } from "lucide-react"
import { setActiveCommittee } from "@/app/actions/committee"

export interface PickerCommittee {
  id: string
  name: string
  role: string
  typeLabel: string | null
  state: string | null
  campaignCount: number
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
}

export function CommitteePicker({
  committees,
  activeCommitteeId,
}: {
  committees: PickerCommittee[]
  activeCommitteeId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function enter(id: string) {
    if (id === activeCommitteeId) {
      router.push("/dashboard")
      return
    }
    setBusyId(id)
    startTransition(async () => {
      await setActiveCommittee(id)
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {committees.map((c) => {
        const isActive = c.id === activeCommitteeId
        const busy = busyId === c.id && pending
        return (
          <button
            key={c.id}
            onClick={() => enter(c.id)}
            disabled={pending}
            className={`flex items-start gap-3 rounded-2xl border bg-white p-5 text-left transition-colors disabled:opacity-60 ${
              isActive ? "border-[#1b3a6b] ring-1 ring-[#1b3a6b]/20" : "border-border hover:border-[#1b3a6b]/40"
            }`}
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b3a6b]/8 text-[#1b3a6b]">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate font-semibold text-[#1a1a2e]">{c.name}</span>
                {isActive && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#1e6b3a]/10 px-2 py-0.5 text-xs font-semibold text-[#1e6b3a]">
                    <Check className="h-3 w-3" /> Current
                  </span>
                )}
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {[c.typeLabel, c.state].filter(Boolean).join(" · ") || "Committee"}
              </span>
              <span className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Megaphone className="h-3.5 w-3.5" />
                  {c.campaignCount} campaign{c.campaignCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-[#1a1a2e]">
                  {ROLE_LABELS[c.role] ?? c.role}
                </span>
              </span>
            </span>
          </button>
        )
      })}

      {/* Create new committee */}
      <Link
        href="/committees/new"
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-white/50 p-5 text-sm font-semibold text-[#1b3a6b] transition-colors hover:border-[#1b3a6b]/50 hover:bg-white"
      >
        <Plus className="h-4 w-4" />
        Create new committee
      </Link>
    </div>
  )
}
