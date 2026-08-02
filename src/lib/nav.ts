import {
  Megaphone,
  Globe,
  Mail,
  Contact,
  Database,
  Users,
  Map,
  HandCoins,
  Building2,
  LayoutDashboard,
  ClipboardList,
  Lightbulb,
  BookOpen,
  Mic,
  Share2,
  Newspaper,
  ScrollText,
  GraduationCap,
  Scale,
  Sparkles,
  Settings,
  FileText,
  Inbox,
  LayoutTemplate,
  type LucideIcon,
} from "lucide-react"
import { PLAN_MODULES, VOTER_FILE_MIN_PLAN, PLAN_ORDER, type PlanId } from "@/lib/entitlements"

export interface NavSubItem {
  href: string
  label: string
  icon: LucideIcon
  /** Match only the exact path (for a module's "Overview" root). */
  exact?: boolean
}

export interface NavModule {
  /** Stable key; ties to entitlements for gating and to the active-route match. */
  key: string
  name: string
  href: string
  icon: LucideIcon
  /** Root path prefix used to decide which module is active. */
  match: string
  /** Sub-sections revealed under the module when it's active. */
  sections: NavSubItem[]
  /**
   * Gating. `always` = a core surface every plan has (Contacts). Otherwise the
   * cheapest plan that unlocks it — a module module id resolved via PLAN_MODULES,
   * or an explicit plan for core surfaces (Voter File).
   */
  minPlan?: PlanId
}

/**
 * The workspace navigation. Built modules carry sub-sections; gated/unbuilt ones
 * appear locked (linking to the dashboard upsell). Keep this in sync with the
 * entitlements module list and each module's real routes.
 */
export const NAV_MODULES: NavModule[] = [
  {
    key: "ai-communications",
    name: "Communications",
    href: "/communications",
    icon: Megaphone,
    match: "/communications",
    sections: [
      { href: "/communications", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/communications/interview", label: "Interview", icon: ClipboardList },
      { href: "/communications/topics", label: "Topics", icon: Lightbulb },
      { href: "/communications/context", label: "Context", icon: BookOpen },
      { href: "/communications/speeches", label: "Speeches", icon: Mic },
      { href: "/communications/letters", label: "Letters", icon: Mail },
      { href: "/communications/social", label: "Social Media", icon: Share2 },
      { href: "/communications/print", label: "Print Media", icon: Newspaper },
      { href: "/communications/newsletter", label: "Newsletter Articles", icon: ScrollText },
      { href: "/communications/guide", label: "Writing Guide", icon: GraduationCap },
      { href: "/communications/models", label: "Choosing a Model", icon: Scale },
    ],
  },
  {
    key: "candidate-websites",
    name: "Candidate Website",
    href: "/website",
    icon: Globe,
    match: "/website",
    sections: [
      { href: "/website", label: "Builder", icon: Sparkles, exact: true },
      { href: "/website/settings", label: "Site settings", icon: Settings },
      { href: "/website/press", label: "Press coverage", icon: Newspaper },
    ],
  },
  {
    key: "newsletter",
    name: "Newsletter",
    href: "/newsletters",
    icon: Mail,
    match: "/newsletters",
    sections: [
      { href: "/newsletters", label: "Newsletters", icon: FileText, exact: true },
      { href: "/newsletters/subscribers", label: "Subscribers", icon: Users },
      { href: "/newsletters/template", label: "Template", icon: LayoutTemplate },
    ],
  },
  {
    key: "contacts",
    name: "Contacts",
    href: "/contacts",
    icon: Contact,
    match: "/contacts",
    minPlan: "starter", // core surface, always available
    sections: [
      { href: "/contacts", label: "All contacts", icon: Contact, exact: true },
      { href: "/contacts/signups", label: "Volunteer signups", icon: Inbox },
    ],
  },
  {
    key: "voters",
    name: "Voter File",
    href: "/voters",
    icon: Database,
    match: "/voters",
    minPlan: VOTER_FILE_MIN_PLAN,
    sections: [],
  },
  {
    key: "voter-outreach",
    name: "Voter Outreach",
    href: "/outreach",
    icon: Users,
    match: "/outreach",
    sections: [],
  },
  {
    key: "field-tools",
    name: "Field Tools",
    href: "/field",
    icon: Map,
    match: "/field",
    sections: [],
  },
  {
    key: "fundraising",
    name: "Fundraising",
    href: "/fundraising",
    icon: HandCoins,
    match: "/fundraising",
    sections: [],
  },
  {
    key: "multi-candidate",
    name: "Multi-Candidate",
    href: "/slate",
    icon: Building2,
    match: "/slate",
    sections: [],
  },
]

const planRank = (p: PlanId) => PLAN_ORDER.indexOf(p)

/** Whether `plan` unlocks a nav module (pillar modules via PLAN_MODULES; core
 *  surfaces via an explicit minPlan). */
export function navModuleUnlocked(m: NavModule, plan: PlanId): boolean {
  if (m.minPlan) return planRank(plan) >= planRank(m.minPlan)
  // Pillar modules: unlocked when the plan includes the module id.
  return (PLAN_MODULES[plan] as string[]).includes(m.key)
}

/** The cheapest plan that unlocks a nav module (for the upsell label). */
export function navUnlockPlan(m: NavModule): PlanId {
  if (m.minPlan) return m.minPlan
  for (const p of PLAN_ORDER) if ((PLAN_MODULES[p] as string[]).includes(m.key)) return p
  return "committee"
}

/** Resolve which module a pathname belongs to (longest matching prefix). */
export function activeModuleKey(pathname: string): string | null {
  let best: NavModule | null = null
  for (const m of NAV_MODULES) {
    if (pathname === m.match || pathname.startsWith(m.match + "/")) {
      if (!best || m.match.length > best.match.length) best = m
    }
  }
  return best?.key ?? null
}
