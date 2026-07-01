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

// ─── Knowledge completeness ──────────────────────────────────────────────────

export interface KnowledgeInput {
  bio?: string | null
  whyRunning?: string | null
  experience?: string | null
  education?: string | null
  coreValues?: string | null
  politicalLean?: string | null
  voiceTone?: string | null
  issuesCount: number
  newsCount: number
}

export type SectionId = "about" | "values" | "issues" | "press" | "voice"

export interface KnowledgeResult {
  score: number // 0–100
  sections: Record<SectionId, boolean>
  /** Enough to generate decent copy. */
  ready: boolean
}

const has = (s: string | null | undefined) => !!s && s.trim().length > 0

// Section weights sum to 100; issues weigh most (they drive generation quality).
const WEIGHTS: Record<SectionId, number> = {
  about: 25,
  values: 20,
  issues: 30,
  press: 10,
  voice: 15,
}

export function computeKnowledge(input: KnowledgeInput): KnowledgeResult {
  const sections: Record<SectionId, boolean> = {
    about: has(input.whyRunning) && (has(input.bio) || has(input.experience)),
    values: has(input.politicalLean) || has(input.coreValues),
    issues: input.issuesCount >= 2,
    press: input.newsCount >= 1,
    voice: has(input.voiceTone),
  }
  const score = (Object.keys(WEIGHTS) as SectionId[]).reduce(
    (sum, id) => sum + (sections[id] ? WEIGHTS[id] : 0),
    0
  )
  // "Ready" once the essentials are in place: a reason for running and an issue.
  const ready = sections.about && input.issuesCount >= 1
  return { score, sections, ready }
}
