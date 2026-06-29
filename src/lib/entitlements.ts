/**
 * Entitlements (stub) for the Engage Campaign pillar shell.
 *
 * The product is a unified shell over a shared CORE (account/committee, contacts/CRM,
 * and the voter file). The five pillars are MODULES gated by plan. This file is the
 * stub the UI reads today; it will later be backed by the account's plan in the
 * database and enforced server-side alongside the ported permission model.
 *
 * Design rule: gate features, never the data. The core is always on; turning on a
 * module just unlocks actions on the shared data.
 */

export type ModuleId =
  | "ai-communications"
  | "candidate-websites"
  | "voter-outreach"
  | "fundraising"
  | "field-tools"

export type PlanId = "starter" | "campaign" | "committee"

export interface ModuleDef {
  id: ModuleId
  name: string
  tagline: string
  /** In-app route once the module is ported in. */
  href: string
}

export const MODULES: ModuleDef[] = [
  {
    id: "ai-communications",
    name: "AI Communications",
    tagline: "Letters, op-eds, posts, and speeches drafted in your voice.",
    href: "/communications",
  },
  {
    id: "candidate-websites",
    name: "Candidate Website",
    tagline: "A modern, mobile-ready campaign site built from your profile.",
    href: "/website",
  },
  {
    id: "voter-outreach",
    name: "Voter Outreach",
    tagline: "Targeted email and text to the right voters in your district.",
    href: "/outreach",
  },
  {
    id: "fundraising",
    name: "Fundraising",
    tagline: "Find proven donors in state and federal records.",
    href: "/fundraising",
  },
  {
    id: "field-tools",
    name: "Field Tools",
    tagline: "Cut turf, organize canvasses, and track every door.",
    href: "/field",
  },
]

export const PLAN_ORDER: PlanId[] = ["starter", "campaign", "committee"]

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: "Starter",
  campaign: "Campaign",
  committee: "Committee",
}

/** Which modules each plan unlocks (cumulative by tier). */
export const PLAN_MODULES: Record<PlanId, ModuleId[]> = {
  starter: ["ai-communications"],
  campaign: ["ai-communications", "voter-outreach", "field-tools"],
  committee: [
    "ai-communications",
    "voter-outreach",
    "field-tools",
    "fundraising",
    "candidate-websites",
  ],
}

/** Stub: the current account's plan. Later: read from session / database. */
export function getCurrentPlan(): PlanId {
  return "starter"
}

export function isUnlocked(moduleId: ModuleId, plan: PlanId): boolean {
  return PLAN_MODULES[plan].includes(moduleId)
}

/** The cheapest plan that unlocks a given module — used for upsell prompts. */
export function unlockPlanFor(moduleId: ModuleId): PlanId {
  for (const p of PLAN_ORDER) {
    if (PLAN_MODULES[p].includes(moduleId)) return p
  }
  return "committee"
}

export function isPlanId(value: string | undefined): value is PlanId {
  return value === "starter" || value === "campaign" || value === "committee"
}
