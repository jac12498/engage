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
  | "multi-candidate"

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
    id: "multi-candidate",
    name: "Multi-Candidate / Slate",
    tagline: "Manage multiple candidates and a shared slate site from one committee.",
    href: "/slate",
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

/**
 * Which modules each plan unlocks (cumulative by tier). Mirrors the marketing
 * site's pricing bullets:
 *   Starter  = Candidate Website (basic) + AI Communications
 *   Campaign = + Voter Outreach + Field & canvassing tools
 *   Committee= + Fundraising + Multi-Candidate / Slate
 * Note: the always-on data surfaces aren't modules — Contacts/CRM is Starter,
 * and Voter File & Search is gated to Campaign (see VOTER_FILE_MIN_PLAN).
 */
export const PLAN_MODULES: Record<PlanId, ModuleId[]> = {
  starter: ["candidate-websites", "ai-communications"],
  campaign: ["candidate-websites", "ai-communications", "voter-outreach", "field-tools"],
  committee: [
    "candidate-websites",
    "ai-communications",
    "voter-outreach",
    "field-tools",
    "fundraising",
    "multi-candidate",
  ],
}

/** The voter file (a core data surface, not a pillar module) unlocks at Campaign. */
export const VOTER_FILE_MIN_PLAN: PlanId = "campaign"

// ─── AI model selection ──────────────────────────────────────────────────────

export interface AiModelDef {
  id: string
  name: string
  blurb: string
}

/** The free-tier default — cheap to serve, ideal for high generation volume. */
export const DEFAULT_AI_MODEL = "claude-haiku-4-5"

/** Models a user may pick from (Campaign+). Starter is pinned to the default. */
export const SELECTABLE_AI_MODELS: AiModelDef[] = [
  { id: "claude-haiku-4-5", name: "Haiku 4.5", blurb: "Fast and economical — great for everyday drafts." },
  { id: "claude-sonnet-4-6", name: "Sonnet 4.6", blurb: "More nuanced writing for op-eds and longer pieces." },
]

/** Whether a plan may choose its generation model (vs. being pinned to Haiku). */
export function canSelectModel(plan: PlanId): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf("campaign")
}

/**
 * Resolve which model a generation should actually use. Starter is always the
 * default Haiku; Campaign+ may use their saved preference if it's allowed.
 */
export function resolveModel(plan: PlanId, preferred: string | null | undefined): string {
  if (!canSelectModel(plan)) return DEFAULT_AI_MODEL
  if (preferred && SELECTABLE_AI_MODELS.some((m) => m.id === preferred)) return preferred
  return DEFAULT_AI_MODEL
}

/** Monthly generation cap by plan (Starter is limited; paid tiers unlimited). */
export const GENERATION_LIMITS: Record<PlanId, number | null> = {
  starter: 25,
  campaign: null,
  committee: null,
}

/**
 * Monthly website-crawl cap by plan. Crawling a whole site is far heavier than a
 * single URL/PDF summary (many fetches + a large AI summary), so it's metered
 * separately and kept low on the free tier.
 */
export const WEBSITE_CRAWL_LIMITS: Record<PlanId, number | null> = {
  starter: 5,
  campaign: 50,
  committee: null,
}

/** Coerce a raw DB plan string into a PlanId, defaulting to the free tier. */
export function toPlanId(value: string | null | undefined): PlanId {
  return isPlanId(value ?? undefined) ? (value as PlanId) : "starter"
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
