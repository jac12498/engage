import "server-only"
import { anthropic } from "@/lib/comms/anthropic"
import { draftingThinking } from "@/lib/comms/prompts"
import { prisma } from "@/lib/prisma"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { BLOCK_SPECS, BLOCK_ORDER, isBlockType, type BlockType } from "@/lib/website/blocks"
import { BLOCK_PROP_SHAPES } from "@/lib/website/agentTools"
import { extractJson } from "@/lib/website/generate"

// Per-section website generation — the three AI actions that replace the monolithic
// draft (Phase C). All are grounded in the committee's real profile/positions/topics,
// use the same strong model as the one-shot draft, and NEVER persist directly: the
// block writer returns validated props for the editor to review + save; the two
// suggesters return structural suggestions the user applies explicitly.
const MODEL = "claude-sonnet-5"

const SYSTEM =
  "You are an expert political web copywriter and information architect. You write warm, authentic, " +
  "specific campaign-website copy grounded in the committee and its candidates' real profiles — concrete " +
  "over abstract, never inventing biographical facts, endorsements, or policy positions the material " +
  "doesn't support. For a single-candidate committee the site centers on that candidate; for a party / " +
  "multi-candidate committee it is an ORGANIZATION landing page (mission + slate), never written in one " +
  "candidate's first person. Return ONLY valid JSON — no markdown fences, no commentary."

// ─── Grounding ───────────────────────────────────────────────────────────────

export interface SiteGrounding {
  committeeName: string
  multiCandidate: boolean
  whyRunning: string | null
  coreValues: string | null
  experience: string | null
  voiceTone: string | null
  candidates: { name: string; office: string; party: string | null; bio: string | null }[]
  positions: { title: string; body: string | null; keyPoints: string[] }[]
  topics: { title: string; keyMessage: string | null; talkingPoints: string[] }[]
}

/** Load the committee's grounding (Phase 1 fields live on the Committee). */
export async function loadSiteGrounding(committeeId: string): Promise<SiteGrounding> {
  const [committee, candidates, positions, topics] = await Promise.all([
    prisma.committee.findUnique({
      where: { id: committeeId },
      select: {
        name: true,
        committeeType: true,
        whyRunning: true,
        coreValues: true,
        experience: true,
        voiceTone: true,
      },
    }),
    prisma.candidate.findMany({
      where: { committeeId },
      orderBy: { createdAt: "asc" },
      select: {
        candidateName: true,
        bio: true,
        campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { office: true, party: true } },
      },
    }),
    prisma.contextItem.findMany({
      where: { committeeId, type: "position" },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { title: true, body: true, keyPoints: true },
    }),
    prisma.topic.findMany({
      where: { committeeId },
      orderBy: { updatedAt: "desc" },
      select: { title: true, keyMessage: true, talkingPoints: true },
    }),
  ])

  return {
    committeeName: committee?.name ?? "",
    multiCandidate: allowsMultipleCandidates(committee?.committeeType),
    whyRunning: committee?.whyRunning ?? null,
    coreValues: committee?.coreValues ?? null,
    experience: committee?.experience ?? null,
    voiceTone: committee?.voiceTone ?? null,
    candidates: candidates.map((c) => ({
      name: c.candidateName,
      office: c.campaigns[0]?.office ?? "",
      party: c.campaigns[0]?.party ?? null,
      bio: c.bio,
    })),
    positions: positions.map((p) => ({ title: p.title ?? "", body: p.body, keyPoints: p.keyPoints })),
    topics: topics.map((t) => ({ title: t.title, keyMessage: t.keyMessage, talkingPoints: t.talkingPoints })),
  }
}

/** The shared grounding context appended to every AI-action prompt. */
function groundingBlock(g: SiteGrounding): string {
  const lines: string[] = [
    `Committee: ${g.committeeName}`,
    g.multiCandidate
      ? `Type: PARTY / multi-candidate committee — the site is an organization landing (mission + slate), even if only ${g.candidates.length} candidate(s) are entered so far.`
      : `Type: single-candidate committee — the site centers on the candidate.`,
  ]
  if (g.voiceTone) lines.push(`Voice / tone: ${g.voiceTone}`)
  if (g.whyRunning) lines.push(`Why running / mission: ${g.whyRunning}`)
  if (g.coreValues) lines.push(`Core values: ${g.coreValues}`)
  if (g.experience) lines.push(`Experience: ${g.experience}`)

  if (g.candidates.length) {
    lines.push(`Candidates (${g.candidates.length}):`)
    for (const c of g.candidates) {
      const bits = [`- ${c.name} — ${c.office}${c.party ? ` (${c.party})` : ""}`]
      if (c.bio) bits.push(`  Bio: ${c.bio}`)
      lines.push(bits.join("\n"))
    }
  }

  const material: string[] = []
  for (const p of g.positions) {
    const kp = p.keyPoints.length ? ` Key points: ${p.keyPoints.join("; ")}.` : ""
    material.push(`- ${p.title}${p.body ? `: ${p.body}` : ""}${kp}`)
  }
  for (const t of g.topics) {
    const tp = t.talkingPoints.length ? ` Talking points: ${t.talkingPoints.join("; ")}.` : ""
    material.push(`- ${t.title}${t.keyMessage ? `: ${t.keyMessage}` : ""}${tp}`)
  }
  if (material.length) lines.push(`Positions & topics:\n${material.join("\n")}`)

  return lines.join("\n")
}

async function callModel(user: string): Promise<unknown> {
  const thinking = draftingThinking(MODEL)
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    ...(thinking ? { thinking } : {}),
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  })
  let text = ""
  for (const b of res.content) if (b.type === "text") text += b.text
  return extractJson(text)
}

// ─── Level 3: per-block copy ───────────────────────────────────────────────────

/**
 * Write (or improve) one block's copy. Returns props already run through the block's
 * `validate()` — the same safety boundary every write passes — so the caller can hand
 * them straight to the editor. `mode: "improve"` refines the current content; "write"
 * fills a blank block.
 */
export async function aiWriteBlock(input: {
  type: BlockType
  mode: "write" | "improve"
  currentProps: Record<string, unknown>
  instruction?: string
  grounding: SiteGrounding
}): Promise<Record<string, unknown>> {
  const { type, mode, currentProps, instruction, grounding } = input
  const spec = BLOCK_SPECS[type]
  const shape = BLOCK_PROP_SHAPES[type] ?? "{}"

  const user = `Write the content for a "${spec.label}" section of a campaign website.

This block's job: ${spec.description}
Return a single JSON object with EXACTLY this shape (only these keys; omit optional keys you don't use):
${shape}

${
  mode === "improve"
    ? `Improve the CURRENT content below — keep what works, tighten and strengthen the writing, stay on the same topic. Do not discard the section's purpose.\nCURRENT CONTENT:\n${JSON.stringify(currentProps)}`
    : `The section is empty — write it fresh from the committee's profile.`
}
${instruction ? `\nEXTRA INSTRUCTION FROM THE USER: ${instruction}\n` : ""}
Keep it tight and specific. Do not invent facts, endorsements, or positions the material doesn't support. For dynamic sections (news, press, newsletter archive, candidates list) only write the heading and a short intro — the items populate automatically.

COMMITTEE GROUNDING
${groundingBlock(grounding)}`

  const raw = await callModel(user)
  if (raw === null || typeof raw !== "object") throw new Error("The AI returned malformed content. Try again.")
  // validate() is the security boundary — it drops unknown keys and clamps/sanitizes.
  return spec.validate(raw) as Record<string, unknown>
}

// ─── Level 2: page layout ──────────────────────────────────────────────────────

export interface LayoutSuggestion {
  type: BlockType
  label: string
  note: string
}

/** Suggest an ordered set of block types for a page, given its title/purpose. */
export async function aiSuggestLayout(input: {
  pageTitle: string
  existingTypes: string[]
  grounding: SiteGrounding
}): Promise<LayoutSuggestion[]> {
  const { pageTitle, existingTypes, grounding } = input
  const vocab = BLOCK_ORDER.map((t) => `- ${t}: ${BLOCK_SPECS[t].description}`).join("\n")

  const user = `Suggest a good section layout for the "${pageTitle}" page of this campaign website.

Return a JSON object: { "sections": [ { "type": "<block type>", "note": "<why this section, 8 words max>" } ] }
Order the sections top to bottom. Choose 3–7 sections that fit a "${pageTitle}" page. Use ONLY these block types:
${vocab}
${existingTypes.length ? `\nThe page already has these sections (you may repeat a type only if it clearly helps): ${existingTypes.join(", ")}.` : ""}

COMMITTEE GROUNDING
${groundingBlock(grounding)}`

  const raw = await callModel(user)
  const o = (raw ?? {}) as Record<string, unknown>
  const arr = Array.isArray(o.sections) ? o.sections : []
  const out: LayoutSuggestion[] = []
  for (const row of arr) {
    const r = (row ?? {}) as Record<string, unknown>
    const type = typeof r.type === "string" ? r.type : ""
    if (!isBlockType(type)) continue
    out.push({
      type,
      label: BLOCK_SPECS[type].label,
      note: typeof r.note === "string" ? r.note.trim().slice(0, 80) : "",
    })
    if (out.length >= 10) break
  }
  return out
}

// ─── Level 1: sitemap ──────────────────────────────────────────────────────────

export interface PageSuggestion {
  title: string
  purpose: string
  blocks: BlockType[]
}

/** Suggest pages (a sitemap) for the committee's site, excluding ones it already has. */
export async function aiSuggestSitemap(input: {
  existingTitles: string[]
  grounding: SiteGrounding
}): Promise<PageSuggestion[]> {
  const { existingTitles, grounding } = input
  const vocab = BLOCK_ORDER.map((t) => t).join(", ")

  const user = `Suggest pages for this campaign website (a sitemap).

Return a JSON object: { "pages": [ { "title": "<page title>", "purpose": "<one short sentence>", "blocks": ["<block type>", ...] } ] }
Suggest 3–6 pages that suit this committee. For each, list the block types (in order) that page should contain, using ONLY these types: ${vocab}.
${existingTitles.length ? `The site ALREADY has these pages — do NOT suggest duplicates: ${existingTitles.join(", ")}.` : ""}
Prefer a focused site (Home plus a few pages like About, Issues, Get Involved, News). Do not suggest a page the committee has no material for.

COMMITTEE GROUNDING
${groundingBlock(grounding)}`

  const raw = await callModel(user)
  const o = (raw ?? {}) as Record<string, unknown>
  const arr = Array.isArray(o.pages) ? o.pages : []
  const out: PageSuggestion[] = []
  for (const row of arr) {
    const r = (row ?? {}) as Record<string, unknown>
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 100) : ""
    if (!title) continue
    const blocks = Array.isArray(r.blocks)
      ? r.blocks.filter((b): b is BlockType => typeof b === "string" && isBlockType(b))
      : []
    out.push({
      title,
      purpose: typeof r.purpose === "string" ? r.purpose.trim().slice(0, 200) : "",
      blocks,
    })
    if (out.length >= 8) break
  }
  return out
}
