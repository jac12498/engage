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
  const single = p.candidates.length === 1
  const lines: string[] = [
    `Committee/organization: ${p.committeeName}${p.state ? ` (${p.state})` : ""}`,
    single
      ? `This is a single-candidate committee — the site should center on the candidate.`
      : `This is a multi-candidate/party committee — the site should be a party landing that presents the slate of candidates.`,
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
  "the material. The site belongs to a committee: for a single-candidate committee it centers on that " +
  "candidate; for a party/multi-candidate committee it's a party landing presenting the slate. Write the " +
  "About section as a warm narrative. Return ONLY valid JSON — no markdown fences, no commentary."

export async function generateWebsiteDraft(
  profile: CommitteeSiteProfile,
  positions: IssueSource[],
  topics: TopicSource[]
): Promise<WebsiteDraft> {
  const single = profile.candidates.length === 1
  const user = `Write the homepage copy for this committee's website. Return a single JSON object with EXACTLY these keys:

{
  "heroHeadline": "punchy homepage headline, 8 words or fewer",
  "heroSubhead": "1-2 sentences under the headline",
  "aboutHeading": "short heading for the About section",
  "aboutBody": "2-4 short paragraphs (separate paragraphs with \\n\\n)${single ? ", a warm third-person bio of the candidate" : ", about the committee and what it stands for"}",
  "candidatesIntro": "${single ? "" : "1-2 sentence intro to the section listing the committee's candidates"}",
  "issuesIntro": "1-2 sentence intro to the issues section",
  "issues": [ { "title": "issue name", "body": "1-2 short paragraphs" } ],
  "volunteerIntro": "1-2 sentences inviting people to get involved"
}

Produce 3 to 6 issues, drawn from the source material below (do not invent positions the material doesn't support).${single ? " Leave candidatesIntro as an empty string." : " candidatesIntro introduces the candidates section."}

COMMITTEE PROFILE
${profileBlock(profile)}

ISSUE SOURCE MATERIAL
${materialBlock(positions, topics)}`

  const thinking = draftingThinking(WEBSITE_MODEL)
  const res = await anthropic.messages.create({
    model: WEBSITE_MODEL,
    max_tokens: 2500,
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
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Website generation returned no JSON.")

  let raw: unknown
  try {
    raw = JSON.parse(text.slice(start, end + 1))
  } catch {
    throw new Error("Website generation returned malformed JSON.")
  }

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
