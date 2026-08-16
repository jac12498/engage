"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, Building2, Megaphone } from "lucide-react"
import { setActiveCommittee, setActiveCampaign } from "@/app/actions/committee"

export interface SwitcherCommittee {
  id: string
  name: string
}
export interface SwitcherCampaign {
  id: string
  candidateName: string
  committeeName: string | null
}

/**
 * Committee + campaign switchers for the sidebar. Committee-wide modules (CRM,
 * members, billing) act on the active committee; candidate-specific modules
 * (communications, website, newsletter) act on the active campaign. Switching
 * persists server-side and refreshes the session, then re-renders.
 */
export function WorkspaceSwitcher({
  committees,
  activeCommitteeId,
  campaigns,
  activeCampaignId,
}: {
  committees: SwitcherCommittee[]
  activeCommitteeId: string
  campaigns: SwitcherCampaign[]
  activeCampaignId: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onCommittee(id: string) {
    if (id === activeCommitteeId) return
    startTransition(async () => {
      await setActiveCommittee(id)
      router.refresh()
    })
  }
  function onCampaign(id: string) {
    if (id === activeCampaignId) return
    startTransition(async () => {
      await setActiveCampaign(id)
      router.refresh()
    })
  }

  const showCommittees = committees.length > 1
  const showCampaigns = campaigns.length > 1

  // Nothing to switch between → render nothing (single committee, single campaign).
  if (!showCommittees && !showCampaigns) return null

  return (
    <div className={`space-y-2 ${pending ? "opacity-60" : ""}`}>
      {showCommittees && (
        <SelectRow
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Committee"
          value={activeCommitteeId}
          onChange={onCommittee}
          disabled={pending}
          options={committees.map((c) => ({ value: c.id, label: c.name }))}
        />
      )}
      {showCampaigns && (
        <SelectRow
          icon={<Megaphone className="h-3.5 w-3.5" />}
          label="Campaign"
          value={activeCampaignId ?? ""}
          onChange={onCampaign}
          disabled={pending}
          options={campaigns.map((c) => ({
            value: c.id,
            label: c.candidateName || c.committeeName || "Untitled campaign",
          }))}
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
