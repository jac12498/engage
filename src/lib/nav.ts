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
  Tag,
  SlidersHorizontal,
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
  /** When set, the item only shows if the same-named gate is satisfied (see AppShell). */
  gate?: string
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
  /**
   * Dev-only: hidden entirely in production (nav + dashboard + route), available
   * on the dev database. Used to keep a feature in the workspace while it's still
   * being built. Gated by isDevEnv() (server side).
   */
  devOnly?: boolean
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
      { href: "/communications/speeches", label: "Speeches", icon: Mic, gate: "speeches" },
      { href: "/communications/letters", label: "Letters", icon: Mail },
      { href: "/communications/social", label: "Social Media", icon: Share2 },
      { href: "/communications/print", label: "Print Media", icon: Newspaper },
      { href: "/communications/newsletter", label: "Newsletter Articles", icon: ScrollText },
    ],
  },
  {
    key: "candidate-websites",
    name: "Candidate Website",
    href: "/website",
    icon: Globe,
    match: "/website",
    // Dev-only while the committee-website generator is being reworked — hidden in prod.
    devOnly: true,
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
      { href: "/contacts/signups", label: "Volunteer signups", icon: Inbox, gate: "volunteerSignups" },
      { href: "/contacts/tags", label: "Manage tags", icon: Tag, gate: "manageTags" },
      { href: "/contacts/fields", label: "Manage fields", icon: SlidersHorizontal, gate: "manageFields" },
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

/**
 * The committee-level AI grounding sub-items. Data always lives on the committee,
 * but the pages sit at canonical /settings/* URLs and the sidebar places them under
 * **Committee Settings** for a multi-candidate committee (the committee's shared
 * voice) or **Candidate Settings** for a single-candidate committee (reads as the
 * candidate's) — see AppSidebar. Gated on ai-communications:update.
 */
export const GROUNDING_SECTIONS: NavSubItem[] = [
  { href: "/settings/voice", label: "Voice & Interview", icon: ClipboardList },
  { href: "/settings/topics", label: "Topics", icon: Lightbulb },
  { href: "/settings/context", label: "Context", icon: BookOpen },
]

/** AI Assistant sub-items — reference for AI-assisted writing (visible to all). */
export const AI_ASSISTANT_SECTIONS: NavSubItem[] = [
  { href: "/ai/guide", label: "Writing Guide", icon: GraduationCap },
  { href: "/ai/models", label: "Choosing a Model", icon: Scale },
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
