import "server-only"
import { anthropic } from "@/lib/comms/anthropic"
import { draftingThinking } from "@/lib/comms/prompts"

// Website copy is a one-time-ish, quality-sensitive draft, so it uses a strong
// model and is NOT metered against Communications' Model Credits (the website
// is a separate product surface). Editable after generation.
const WEBSITE_MODEL = "claude-sonnet-5"

export interface WebsiteDraft {
  heroHeadline: string
  heroSubhead: string
  aboutHeading: string
  aboutBody: string
  candidatesIntro: string
  issuesIntro: string
  issues: { title: string; body: string }[]
  volunteerIntro: string
}

/** One candidate on the committee, for the site draft. */
export interface CandidateProfile {
  candidateName: string
  office: string
  party?: string | null
  bio?: string | null
  whyRunning?: string | null
  coreValues?: string | null
}

/** The committee whose site we're drafting, plus its candidates. */
export interface CommitteeSiteProfile {
  committeeName: string
  state?: string | null
  /** True for a party/multi-candidate committee (by TYPE, not candidate count) —
   *  the site is an organization landing, not one candidate's page. */
  multiCandidate: boolean
  candidates: CandidateProfile[]
}

export interface IssueSource {
  title: string
  body?: string | null
  keyPoints?: string[]
}
export interface TopicSource {
  title: string
  keyMessage?: string | null
  talkingPoints?: string[]
}

function profileBlock(p: CommitteeSiteProfile): string {
  const single = !p.multiCandidate
  const lines: string[] = [
    `Committee/organization: ${p.committeeName}${p.state ? ` (${p.state})` : ""}`,
    single
      ? `This is a single-candidate committee — the site should center on the candidate.`
      : `This is a multi-candidate/party committee — the site is an ORGANIZATION landing presenting the committee and its slate, even if only ${p.candidates.length} candidate(s) are entered so far. Do NOT center it on a single person.`,
    `Candidates (${p.candidates.length}):`,
  ]
  for (const c of p.candidates) {
    const bits = [`- ${c.candidateName} — running for ${c.office}${c.party ? ` (${c.party})` : ""}`]
    if (c.bio) bits.push(`  Bio: ${c.bio}`)
    if (c.whyRunning) bits.push(`  Why running: ${c.whyRunning}`)
    if (c.coreValues) bits.push(`  Core values: ${c.coreValues}`)
    lines.push(bits.join("\n"))
  }
  return lines.join("\n")
}

function materialBlock(positions: IssueSource[], topics: TopicSource[]): string {
  const parts: string[] = []
  for (const pos of positions) {
    const kp = pos.keyPoints?.length ? ` Key points: ${pos.keyPoints.join("; ")}.` : ""
    parts.push(`- ${pos.title}${pos.body ? `: ${pos.body}` : ""}${kp}`)
  }
  for (const t of topics) {
    const tp = t.talkingPoints?.length ? ` Talking points: ${t.talkingPoints.join("; ")}.` : ""
    parts.push(`- ${t.title}${t.keyMessage ? `: ${t.keyMessage}` : ""}${tp}`)
  }
  return parts.length ? parts.join("\n") : "(No standing positions provided — infer a few reasonable, non-specific priorities from the bio and values, and keep them general.)"
}

const SYSTEM =
  "You are an expert political web copywriter. You write warm, authentic, specific campaign-website " +
  "copy grounded in the committee and its candidates' real profiles — concrete over abstract, genuine " +
  "over platitudes, and never inventing biographical facts or policy positions that aren't supported by " +
  "the material. The site belongs to a committee. For a SINGLE-candidate committee it centers on that " +
  "candidate (a warm third-person bio, their positions). For a PARTY / MULTI-candidate committee it is an " +
  "ORGANIZATION landing page — modeled on real county-party committee sites — NOT about any one person: it " +
  "leads with the committee's mission and its slate of candidates, then 'who we are' (what the committee " +
  "does — organizing, registering voters, supporting candidates up and down the ballot), a shared platform " +
  "of priorities the whole slate runs on, and clear ways to get involved and chip in. Never write the " +
  "committee's copy in the first person of a single candidate. Return ONLY valid JSON — no markdown fences, " +
  "no commentary."

export async function generateWebsiteDraft(
  profile: CommitteeSiteProfile,
  positions: IssueSource[],
  topics: TopicSource[]
): Promise<WebsiteDraft> {
  const single = !profile.multiCandidate
  const user = `Write the homepage copy for this committee's website. Return a single JSON object with EXACTLY these keys:

{
  "heroHeadline": "punchy homepage headline, 8 words or fewer${single ? "" : " — rallying and mission-forward for the COMMITTEE (e.g. electing its slate / a party's goal for the area), never a single person's name"}",
  "heroSubhead": "1-2 sentences under the headline${single ? "" : " — what the committee is working toward"}",
  "aboutHeading": "short heading for the About section${single ? "" : ' (e.g. "Who we are")'}",
  "aboutBody": "2-4 short paragraphs (separate paragraphs with \\n\\n)${single ? ", a warm third-person bio of the candidate" : " — who the committee is and what it does: organizing, registering voters, and supporting candidates up and down the ballot; its mission and values. Do NOT write it as one candidate's personal story."}",
  "candidatesIntro": "${single ? "" : "1-2 sentence intro to the section presenting the committee's slate of candidates"}",
  "issuesIntro": "1-2 sentence intro to the issues section${single ? "" : " — the shared priorities the whole slate runs on"}",
  "issues": [ { "title": "issue name", "body": "1-2 short paragraphs" } ],
  "volunteerIntro": "1-2 sentences inviting people to get involved${single ? "" : " — concrete ways to help the committee (canvassing, phone banking, attending meetings/events)"}"
}

Produce 3 to 6 issues, drawn from the source material below (do not invent positions the material doesn't support).${single ? " Leave candidatesIntro as an empty string." : " candidatesIntro introduces the slate section — the site is the committee's, not any single candidate's."}

COMMITTEE PROFILE
${profileBlock(profile)}

ISSUE SOURCE MATERIAL
${materialBlock(positions, topics)}`

  const thinking = draftingThinking(WEBSITE_MODEL)
  const res = await anthropic.messages.create({
    model: WEBSITE_MODEL,
    max_tokens: 4000,
    ...(thinking ? { thinking } : {}),
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  })

  let text = ""
  for (const b of res.content) {
    if (b.type === "text") text += b.text
  }

  return parseDraft(text)
}

/** Pull the JSON object out of the response and coerce it into a safe WebsiteDraft. */
function parseDraft(text: string): WebsiteDraft {
  const raw = extractJson(text)
  if (raw === null) throw new Error("Website generation returned malformed JSON.")

  const o = raw as Record<string, unknown>
  const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v.trim() : fallback)

  const issuesRaw = Array.isArray(o.issues) ? o.issues : []
  const issues = issuesRaw
    .map((i) => {
      const io = (i ?? {}) as Record<string, unknown>
      return { title: str(io.title), body: str(io.body) }
    })
    .filter((i) => i.title && i.body)
    .slice(0, 8)

  return {
    heroHeadline: str(o.heroHeadline),
    heroSubhead: str(o.heroSubhead),
    aboutHeading: str(o.aboutHeading, "About"),
    aboutBody: str(o.aboutBody),
    candidatesIntro: str(o.candidatesIntro),
    issuesIntro: str(o.issuesIntro),
    issues,
    volunteerIntro: str(o.volunteerIntro),
  }
}

/**
 * Extract a JSON object from a model response, tolerating two common LLM defects:
 * a fenced ```json block, and raw (unescaped) newlines/tabs inside string values
 * (which are invalid JSON — the multi-paragraph aboutBody is the usual offender).
 * Returns the parsed value, or null if it still can't be parsed.
 */
function extractJson(text: string): unknown {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1]
  const start = t.indexOf("{")
  const end = t.lastIndexOf("}")
  if (start === -1 || end === -1) return null
  const body = t.slice(start, end + 1)
  try {
    return JSON.parse(body)
  } catch {
    try {
      return JSON.parse(escapeStringControlChars(body))
    } catch {
      return null
    }
  }
}

/**
 * Escape raw control characters (newline, CR, tab) that appear INSIDE JSON string
 * literals, leaving structural whitespace between tokens untouched. A tiny state
 * machine so already-escaped sequences (\" \n \\) pass through unharmed.
 */
function escapeStringControlChars(s: string): string {
  let out = ""
  let inString = false
  let escaped = false
  for (const ch of s) {
    if (escaped) {
      out += ch
      escaped = false
      continue
    }
    if (ch === "\\") {
      out += ch
      escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      out += ch
      continue
    }
    if (inString && (ch === "\n" || ch === "\r" || ch === "\t")) {
      out += ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : "\\t"
      continue
    }
    out += ch
  }
  return out
}
