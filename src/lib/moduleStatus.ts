import "server-only"
import type { LucideIcon } from "lucide-react"
import type { CampaignProfile } from "@/lib/context"
import { NAV_MODULES, navModuleUnlocked, navUnlockPlan } from "@/lib/nav"
import type { PlanId } from "@/lib/entitlements"

/**
 * Per-module status + setup requirements — the single source of truth for both
 * the dashboard launcher (status grid) and the in-module setup gates.
 *
 * Three states, in priority order:
 *  - "locked"      — the plan doesn't include this module ("Upgrade to use").
 *  - "needs-setup" — unlocked, but a HARD prerequisite is missing (a real gate,
 *                    not a first-use nudge). The module's layout blocks on the
 *                    same requirement via `moduleSetupRequirement`.
 *  - "active"      — unlocked and usable now.
 *
 * Setup here means only hard prerequisites — a candidate profile (Communications
 * and Website generate from it) and a committee mailing address (CAN-SPAM, before
 * a newsletter can be emailed). "Write your first draft" / "add contacts" are
 * empty-state nudges that live inside each module, NOT setup — otherwise every
 * fresh module would read as "Needs Setup" forever.
 */

export type ModuleStatusKind = "active" | "needs-setup" | "locked"

/** A hard prerequisite that blocks a module until completed. */
export interface SetupRequirement {
  /** Short reason, shown on the dashboard card and as the gate subtitle. */
  reason: string
  /** Where to go to complete it. */
  href: string
  /** Call-to-action label. */
  cta: string
}

export interface ModuleStatus {
  key: string
  name: string
  icon: LucideIcon
  /** Where the primary "Open" action goes. */
  href: string
  status: ModuleStatusKind
  /** locked only: the cheapest plan that unlocks the module. */
  unlockPlan?: PlanId
  /** needs-setup only: where to complete the prerequisite, and a short reason. */
  setupHref?: string
  setupReason?: string
}

/** Does the campaign have the candidate profile that generation depends on? */
export function hasCandidateProfile(campaign: CampaignProfile): boolean {
  return Boolean(campaign.bio?.trim() && campaign.whyRunning?.trim())
}

/** Does the campaign have the postal address CAN-SPAM requires to email? */
export function hasMailingAddress(campaign: CampaignProfile): boolean {
  return Boolean(
    campaign.mailingStreet?.trim() &&
      campaign.mailingCity?.trim() &&
      campaign.mailingState?.trim() &&
      campaign.mailingZip?.trim(),
  )
}

/**
 * The unmet hard prerequisite for a module (by nav key), or null if it's ready.
 * Shared by the dashboard status and each module's setup gate so they never drift.
 */
export function moduleSetupRequirement(key: string, campaign: CampaignProfile): SetupRequirement | null {
  switch (key) {
    // Communications + Website are usable without a full candidate profile — the
    // profile only improves results. It's built inside Communications (the Interview),
    // and the site builder handles a thin profile — so these are NOT hard-gated
    // (gating them would trap the very interview used to complete the profile).
    case "newsletter":
      // A postal address is a genuine hard prerequisite (CAN-SPAM) before emailing.
      return hasMailingAddress(campaign)
        ? null
        : { reason: "Add your mailing address first", href: "/settings", cta: "Add mailing address" }
    default:
      return null
  }
}

export function computeModuleStatuses(
  campaign: CampaignProfile,
  plan: PlanId,
  permissions: ReadonlySet<string>,
): ModuleStatus[] {
  return NAV_MODULES
    // Module-based access: only surface modules the member can read. Plan-locked
    // (but readable) modules still appear as "Upgrade to use".
    .filter((m) => permissions.has(`${m.key}:read`))
    .map((m): ModuleStatus => {
    if (!navModuleUnlocked(m, plan)) {
      return { key: m.key, name: m.name, icon: m.icon, href: m.href, status: "locked", unlockPlan: navUnlockPlan(m) }
    }
    const setup = moduleSetupRequirement(m.key, campaign)
    if (setup) {
      return {
        key: m.key,
        name: m.name,
        icon: m.icon,
        href: m.href,
        status: "needs-setup",
        setupHref: setup.href,
        setupReason: setup.reason,
      }
    }
    return { key: m.key, name: m.name, icon: m.icon, href: m.href, status: "active" }
  })
}
