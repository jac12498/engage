import "server-only"
import { anthropic } from "@/lib/comms/anthropic"
import { parseBlocks, type NlBlock } from "@/lib/newsletter/blocks"

// AI drafting for a newsletter issue — mirrors the website generate.ts approach:
// one structured Claude call, profile-grounded, tolerant JSON parse. Emits a
// composed set of content blocks (heading / text / button / divider). The candidate
// reviews/edits the draft before saving, so this returns the draft (never persists).

export interface NewsletterProfile {
  candidateName: string
  office: string
  party?: string | null
  district?: string | null
  state?: string | null
  bio?: string | null
  whyRunning?: string | null
  coreValues?: string | null
  voiceTone?: string | null
}

export interface NewsletterDraft {
  subject: string
  preview: string
  blocks: NlBlock[]
}

function profileBlock(p: NewsletterProfile): string {
  const lines = [
    `Name: ${p.candidateName}`,
    `Running for: ${p.office}${p.district ? ` (${p.district})` : ""}${p.state ? `, ${p.state}` : ""}`,
  ]
  if (p.party) lines.push(`Party: ${p.party}`)
  if (p.bio) lines.push(`Bio: ${p.bio}`)
  if (p.whyRunning) lines.push(`Why running: ${p.whyRunning}`)
  if (p.coreValues) lines.push(`Core values: ${p.coreValues}`)
  if (p.voiceTone) lines.push(`Preferred voice/tone: ${p.voiceTone}`)
  return lines.join("\n")
}

const SYSTEM =
  "You are an expert political campaign writer drafting an email newsletter from a candidate to their supporters. " +
  "Write in the candidate's authentic first-person voice — warm, direct, specific, and genuine, not corporate or vague. " +
  "Ground everything in the candidate's real profile and the update the campaign describes; never invent facts, " +
  "endorsements, poll numbers, events, or positions the material doesn't support. Return ONLY valid JSON — no markdown fences, no commentary."

export async function generateNewsletterDraft(
  profile: NewsletterProfile,
  instruction: string,
  model: string
): Promise<NewsletterDraft> {
  const user = `Draft a newsletter email from this candidate to their supporters as a set of content BLOCKS. Return a single JSON object with EXACTLY these keys:

{
  "subject": "a compelling email subject line, under 80 characters",
  "preview": "a one-sentence preview/preheader that entices the reader to open",
  "blocks": [ /* an ordered array of content blocks (see types below) */ ]
}

BLOCK TYPES (each block is { "type": ..., "props": {...} }):
- { "type": "heading", "props": { "text": "short section heading" } }
- { "type": "text", "props": { "body": "one or more paragraphs, plain text, \\n\\n between paragraphs" } }
- { "type": "button", "props": { "label": "Donate", "href": "#" } }  — a call to action; ALWAYS use "#" for href (the candidate fills in the real link)
- { "type": "divider", "props": {} }  — a visual separator

COMPOSE A REAL ISSUE: open with a warm first-person "text" greeting + the update (use 1-3 "text" blocks, optionally a "heading" to break up sections), then end with ONE "button" call to action (Donate / Volunteer / RSVP). Keep paragraphs short. Write in the candidate's authentic voice. Never invent facts, endorsements, poll numbers, or events the material doesn't support.

WHAT THIS NEWSLETTER IS ABOUT
${instruction}

CANDIDATE PROFILE
${profileBlock(profile)}`

  const res = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  })

  let text = ""
  for (const b of res.content) if (b.type === "text") text += b.text

  return parseDraft(text)
}

function parseDraft(text: string): NewsletterDraft {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Newsletter generation returned no JSON.")
  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error("Newsletter generation returned malformed JSON.")
  }
  const o = raw as Record<string, unknown>
  const str = (v: unknown, f = ""): string => (typeof v === "string" ? v.trim() : f)
  const blocks = parseBlocks(o.blocks)
  return {
    subject: str(o.subject).slice(0, 200),
    preview: str(o.preview).slice(0, 300),
    // Fall back to a single text block if the model returned nothing usable.
    blocks: blocks.length > 0 ? blocks : [{ id: "draft", type: "text", props: { body: str(o.body) } }],
  }
}
