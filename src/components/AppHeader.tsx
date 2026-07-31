import Link from "next/link"
import { LayoutDashboard, LogOut, Settings, ChevronRight } from "lucide-react"
import { signOut } from "@/lib/auth"

export interface HeaderCampaign {
  id: string
  candidateName: string
  committeeName: string | null
  headshotMime: string | null
}

export interface HeaderModule {
  /** Stable id, used to look up a module-specific settings route. */
  id: string
  /** Display name shown in the header, e.g. "Newsletter". */
  name: string
}

/**
 * Module id → its dedicated settings route, when one exists. Modules without a
 * settings page simply don't render a Settings link (per product rule). Add an
 * entry here when a module gains a settings page.
 */
const MODULE_SETTINGS: Record<string, string> = {
  "candidate-websites": "/website/settings",
}

/**
 * App chrome for the authenticated workspace. Shows the campaign identity
 * (headshot + committee), the current module (when inside one), a contextual
 * Settings link, and — inside a module — a link back to the dashboard.
 */
export function AppHeader({
  campaign,
  module,
}: {
  campaign: HeaderCampaign
  module?: HeaderModule
}) {
  // Settings is campaign-wide on the dashboard; module-specific inside a module
  // (only when that module actually has a settings page).
  const settingsHref = module ? MODULE_SETTINGS[module.id] : "/settings"
  const settingsLabel = module ? `${module.name} settings` : "Campaign settings"
  const identity = campaign.committeeName || campaign.candidateName

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-6">
        {/* Brand + module + identity */}
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
              E
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage</span>
          </Link>

          {module && (
            <div className="flex min-w-0 items-center gap-1.5 text-[#1a1a2e]">
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm font-semibold">{module.name}</span>
            </div>
          )}

          {/* Campaign identity */}
          <div className="ml-1 hidden min-w-0 items-center gap-2 border-l border-border pl-3 sm:flex">
            {campaign.headshotMime && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/website/headshot/${campaign.id}`}
                alt=""
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            )}
            <span className="truncate text-sm font-medium text-muted-foreground">{identity}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {module && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[#1a1a2e]"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          )}
          {settingsHref && (
            <Link
              href={settingsHref}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[#1a1a2e]"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{settingsLabel}</span>
              <span className="sm:hidden">Settings</span>
            </Link>
          )}
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/sign-in" })
            }}
          >
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-[#1a1a2e]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
