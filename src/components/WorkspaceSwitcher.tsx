"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, Building2, UserRound, Megaphone } from "lucide-react"
import { setActiveCommittee, setActiveCandidate, setActiveCampaign } from "@/app/actions/committee"

export interface SwitcherCommittee {
  id: string
  name: string
}
export interface SwitcherCandidate {
  id: string
  candidateName: string
}
export interface SwitcherRun {
  id: string
  cycle: number
  office: string
}

/**
 * Committee › Candidate › Campaign switchers for the sidebar. Committee-wide modules
 * (CRM, members, billing) act on the active committee; the candidate scope owns durable
 * profile + website; the campaign (run) scope owns communications, news, newsletters.
 * Each dropdown renders only when there's more than one choice. Switching persists
 * server-side and refreshes the session, then re-renders.
 */
export function WorkspaceSwitcher({
  committees,
  activeCommitteeId,
  candidates,
  activeCandidateId,
  campaigns,
  activeCampaignId,
}: {
  committees: SwitcherCommittee[]
  activeCommitteeId: string
  candidates: SwitcherCandidate[]
  activeCandidateId: string | null
  campaigns: SwitcherRun[]
  activeCampaignId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function pick(fn: (id: string) => Promise<{ ok: boolean }>, id: string, current: string | null) {
    if (id === current) return
    startTransition(async () => {
      await fn(id)
      router.refresh()
    })
  }

  const showCommittees = committees.length > 1
  const showCandidates = candidates.length > 1
  const showCampaigns = campaigns.length > 1

  if (!showCommittees && !showCandidates && !showCampaigns) return null

  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      {showCommittees && (
        <SelectRow
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Committee"
          value={activeCommitteeId}
          disabled={pending}
          onChange={(v) => pick(setActiveCommittee, v, activeCommitteeId)}
          options={committees.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}
      {showCandidates && (
        <SelectRow
          icon={<UserRound className="h-3.5 w-3.5" />}
          label="Candidate"
          value={activeCandidateId ?? ""}
          disabled={pending}
          onChange={(v) => pick(setActiveCandidate, v, activeCandidateId)}
          options={candidates.map((c) => ({ value: c.id, label: c.candidateName || "Untitled candidate" }))}
        />
      )}
      {showCampaigns && (
        <SelectRow
          icon={<Megaphone className="h-3.5 w-3.5" />}
          label="Campaign"
          value={activeCampaignId ?? ""}
          disabled={pending}
          onChange={(v) => pick(setActiveCampaign, v, activeCampaignId)}
          options={campaigns.map((c) => ({ value: c.id, label: `${c.cycle} · ${c.office}` }))}
        />
      )}
    </div>
  )
}

function SelectRow({
  icon,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-border bg-white py-1.5 pl-2.5 pr-7 text-sm font-medium text-[#1a1a2e] outline-none focus:border-[#1b3a6b] disabled:cursor-not-allowed"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  )
}
