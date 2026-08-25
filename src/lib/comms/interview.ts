/**
 * Candidate interview definitions + derived helpers.
 *
 * Pure and dependency-free so both the wizard UI (client) and server actions can
 * share the same question set and summary logic.
 */

// ─── Political-lean questionnaire ────────────────────────────────────────────

export interface LeanDomain {
  id: string
  label: string
  /** Label for the low end of the 1–5 scale. */
  left: string
  /** Label for the high end of the 1–5 scale. */
  right: string
}

export const LEAN_DOMAINS: LeanDomain[] = [
  { id: "economy", label: "Economy & taxes", left: "Free-market", right: "Government action" },
  { id: "social", label: "Social & cultural", left: "Traditional", right: "Progressive" },
  { id: "environment", label: "Environment & climate", left: "Market-led", right: "Aggressive action" },
  { id: "safety", label: "Public safety", left: "Reform-minded", right: "Tough-on-crime" },
  { id: "immigration", label: "Immigration", left: "Restrictive", right: "Welcoming" },
  { id: "healthcare", label: "Healthcare", left: "Private market", right: "Public option" },
]

/** 1–5 position labels (generic, relative to each domain's left/right poles). */
export const LEAN_SCALE: string[] = ["Strongly", "Lean", "Mixed", "Lean", "Strongly"]

export type LeanAnswers = Record<string, number> // domainId -> 1..5

export interface InterviewData {
  lean?: LeanAnswers
  admire?: string // political figures the candidate admires
}

/** Build a readable lean summary from the questionnaire for the prompt. */
export function composeLeanSummary(data: InterviewData | null | undefined): string {
  if (!data?.lean) return ""
  const parts: string[] = []
  for (const d of LEAN_DOMAINS) {
    const v = data.lean[d.id]
    if (!v) continue
    if (v === 3) {
      parts.push(`${d.label}: mixed / centrist`)
    } else {
      const pole = v < 3 ? d.left : d.right
      const strength = v === 1 || v === 5 ? "strongly favors" : "leans toward"
      parts.push(`${d.label}: ${strength} ${pole.toLowerCase()}`)
    }
  }
  if (data.admire?.trim()) parts.push(`Admires: ${data.admire.trim()}`)
  return parts.join("; ")
}

// ─── Voice / tone ────────────────────────────────────────────────────────────

export const VOICE_TONES: string[] = [
  "Warm and plainspoken",
  "Energetic and bold",
  "Calm and authoritative",
  "Friendly and conversational",
  "Serious and policy-focused",
  "Optimistic and inspiring",
]

// ─── Setup checklist ─────────────────────────────────────────────────────────
// A transparent, per-step checklist of exactly what grounds generation — so the
// user can see what's provided and what's still needed (replaces the old opaque
// weighted "knowledge" score). Optional items are shown but don't gate 100%.

const has = (s: string | null | undefined) => !!s && s.trim().length > 0

export interface SetupItem {
  label: string
  done: boolean
  /** Shown but not counted toward the score (a nice-to-have). */
  optional?: boolean
}

export interface SetupStep {
  id: "voice" | "topics" | "context"
  label: string
  href: string
  items: SetupItem[]
}

export interface SetupChecklist {
  steps: SetupStep[]
  doneCount: number // completed REQUIRED items
  total: number // total REQUIRED items
  score: number // 0–100 over required items
}

export interface SetupInput {
  /** Multi-candidate committee → committee-framed labels + no person bio. */
  isCommittee: boolean
  whyRunning?: string | null
  bio?: string | null
  experience?: string | null
  coreValues?: string | null
  politicalLean?: string | null
  voiceTone?: string | null
  topicsCount: number
  positionCount: number
  referenceCount: number
}

/** What grounds generation, grouped by setup step, with per-item done flags. */
export function computeSetupChecklist(input: SetupInput): SetupChecklist {
  // Person has a bio; a committee describes itself through its history/background.
  const background = input.isCommittee
    ? has(input.experience)
    : has(input.bio) || has(input.experience)

  const steps: SetupStep[] = [
    {
      id: "voice",
      label: "Voice & Interview",
      href: "/settings/voice",
      items: [
        {
          label: input.isCommittee ? "What the committee stands for" : "Why you're running",
          done: has(input.whyRunning),
        },
        { label: input.isCommittee ? "History & background" : "Bio or background", done: background },
        { label: "Core values or political lean", done: has(input.coreValues) || has(input.politicalLean) },
        { label: "Preferred voice & tone", done: has(input.voiceTone) },
      ],
    },
    {
      id: "topics",
      label: "Topics",
      href: "/settings/topics",
      items: [{ label: "At least one topic to write about", done: input.topicsCount >= 1 }],
    },
    {
      id: "context",
      label: "Context",
      href: "/settings/context",
      items: [
        { label: "At least one position on an issue", done: input.positionCount >= 1 },
        { label: "A reference or news item", done: input.referenceCount >= 1, optional: true },
      ],
    },
  ]

  const required = steps.flatMap((s) => s.items).filter((i) => !i.optional)
  const doneCount = required.filter((i) => i.done).length
  const total = required.length
  const score = total === 0 ? 100 : Math.round((doneCount / total) * 100)
  return { steps, doneCount, total, score }
}
