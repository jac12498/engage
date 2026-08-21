"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LogOut, Lock, Menu, X, Sparkles, Users, UserRound, Megaphone, Building2, ShieldCheck, type LucideIcon } from "lucide-react"
import { NAV_MODULES, navModuleUnlocked, navUnlockPlan, activeModuleKey } from "@/lib/nav"
import { PLAN_LABELS, type PlanId } from "@/lib/entitlements"
import { signOutAction } from "@/app/actions/auth"
import {
  WorkspaceSwitcher,
  type SwitcherCommittee,
  type SwitcherCandidate,
  type SwitcherRun,
} from "@/components/WorkspaceSwitcher"

export interface SidebarCampaign {
  id: string
  candidateName: string
  committeeName: string | null
  headshotMime: string | null
}

export function AppSidebar({
  plan,
  role,
  permissions,
  isSystemAdmin,
  committees,
  activeCommitteeId,
  committeeName,
  committeeAvatarUrl,
  candidates,
  activeCandidateId,
  campaigns,
  activeCampaignId,
  multiCandidate,
  sectionGates,
}: {
  campaign: SidebarCampaign | null
  plan: PlanId
  role: string
  /** Privilege keys held in the active committee (e.g. "contacts:update"). */
  permissions: string[]
  /** Shows the System Admin link (Overall System Administrator only). */
  isSystemAdmin: boolean
  committees: SwitcherCommittee[]
  activeCommitteeId: string
  committeeName: string
  /** Resolved avatar for the identity block: committee logo → candidate logo → image, or null. */
  committeeAvatarUrl: string | null
  candidates: SwitcherCandidate[]
  activeCandidateId: string | null
  campaigns: SwitcherRun[]
  activeCampaignId: string | null
  /** May the user add a candidate now (perm + cardinality room)? */
  canAddCandidate: boolean
  /** Whether this committee type allows multiple candidates (party/multi vs single). */
  multiCandidate: boolean
  /** Satisfied nav gates (e.g. { volunteerSignups: true }) — gated sub-items show only when true. */
  sectionGates: Record<string, boolean>
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const activeKey = activeModuleKey(pathname)
  const perms = new Set(permissions)
  const canManageMembers = perms.has("members:manage")
  // Committee administration is owner/admin-level; the other links gate on the
  // privilege that makes their destination usable.
  const isCommitteeAdmin = role === "owner" || role === "admin"
  const canEditProfile = perms.has("ai-communications:update") || perms.has("candidate-websites:update")
  const canManageCampaigns = perms.has("campaigns:manage")
  const canManageBilling = perms.has("billing:manage")
  const close = () => setOpen(false)

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-white px-4 md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-1.5 text-[#1a1a2e] hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
        <Brand />
      </div>

      {/* Backdrop (mobile) */}
      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={close} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-white transition-transform md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand + identity */}
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center justify-between">
            <Brand />
            <button onClick={close} aria-label="Close menu" className="rounded-lg p-1 text-muted-foreground hover:bg-muted md:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            {committeeAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={committeeAvatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg border border-border bg-white object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1b3a6b]/8 text-[#1b3a6b]">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#1a1a2e]">{committeeName}</p>
              <p className="text-xs text-muted-foreground">{PLAN_LABELS[plan]} plan</p>
            </div>
          </div>

          {/* Committee + campaign switchers (render only when there's a choice). */}
          <div className="mt-3">
            <WorkspaceSwitcher
              committees={committees}
              activeCommitteeId={activeCommitteeId}
              candidates={candidates}
              activeCandidateId={activeCandidateId}
              campaigns={campaigns}
              activeCampaignId={activeCampaignId}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          <Row href="/dashboard" label="Dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"} onClick={close} />

          <div className="pt-3" />

          {NAV_MODULES.map((m) => {
            // Module-based access: hide a module entirely when the member's role
            // grants no read privilege on it. Plan-locked-but-readable modules
            // still show as an upsell below.
            if (!perms.has(`${m.key}:read`)) return null
            // The website is committee-owned; a party/multi-candidate committee sees
            // it as the "Committee Website", a single-candidate committee as theirs.
            const name =
              m.key === "candidate-websites" && multiCandidate ? "Committee Website" : m.name
            const unlocked = navModuleUnlocked(m, plan)
            if (!unlocked) {
              return (
                <Link
                  key={m.key}
                  href={`/upgrade/${m.key}`}
                  onClick={close}
                  title={`Unlock with ${PLAN_LABELS[navUnlockPlan(m)]}`}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/70 transition-colors hover:bg-muted"
                >
                  <m.icon className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 truncate">{name}</span>
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                </Link>
              )
            }
            const moduleActive = activeKey === m.key
            return (
              <div key={m.key}>
                <Row href={m.href} label={name} icon={m.icon} active={moduleActive && m.sections.length === 0} onClick={close} bold={moduleActive} />
                {moduleActive && m.sections.length > 0 && (
                  <div className="mb-1 mt-0.5 space-y-0.5 border-l border-border pl-3 ml-4">
                    {m.sections
                      .filter((s) => !s.gate || sectionGates[s.gate])
                      .map((s) => (
                      <Row key={s.href} href={s.href} label={s.label} icon={s.icon} active={isActive(s.href, s.exact)} onClick={close} small />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="space-y-0.5 border-t border-border px-3 py-3">
          {isCommitteeAdmin && (
            <Row href="/committees/settings" label="Committee Settings" icon={Building2} active={isActive("/committees/settings")} onClick={close} />
          )}
          {canEditProfile && (
            <Row href="/settings" label="Candidate Settings" icon={UserRound} active={isActive("/settings")} onClick={close} />
          )}
          {activeCandidateId && canManageCampaigns && (
            <Row href="/campaigns" label="Campaigns" icon={Megaphone} active={isActive("/campaigns")} onClick={close} />
          )}
          {canManageMembers && (
            <Row href="/members" label="Members" icon={Users} active={isActive("/members")} onClick={close} />
          )}
          {canManageBilling && (
            <Row href="/plans" label="Plans" icon={Sparkles} active={isActive("/plans")} onClick={close} />
          )}
          {isSystemAdmin && (
            <Row href="/admin" label="System Admin" icon={ShieldCheck} active={isActive("/admin")} onClick={close} />
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[#1a1a2e] transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
        E
      </span>
      <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage</span>
    </Link>
  )
}

function Row({
  href,
  label,
  icon: Icon,
  active,
  onClick,
  small,
  bold,
}: {
  href: string
  label: string
  icon: LucideIcon
  active: boolean
  onClick: () => void
  small?: boolean
  bold?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 text-sm transition-colors ${
        small ? "py-1.5" : "py-2"
      } ${
        active
          ? "bg-[#1b3a6b] font-medium text-white"
          : `text-[#1a1a2e] hover:bg-muted ${bold ? "font-medium" : ""}`
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-white" : "text-muted-foreground"}`} />
      <span className="truncate">{label}</span>
    </Link>
  )
}
