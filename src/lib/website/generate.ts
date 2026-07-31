import "server-only"
import { anthropic } from "@/lib/comms/anthropic"

// Website copy is a one-time-ish, quality-sensitive draft, so it uses a strong
// model and is NOT metered against Communications' Model Credits (the website
// is a separate product surface). Editable after generation.
const WEBSITE_MODEL = "claude-sonnet-4-6"

export interface WebsiteDraft {
  heroHeadline: string
  heroSubhead: string
  aboutHeading: string
  aboutBody: string
  issuesIntro: string
  issues: { title: string; body: string }[]
  volunteerIntro: string
}

export interface WebsiteProfile {
  candidateName: string
  office: string
  party?: string | null
  tagline?: string | null
  bio?: string | null
  whyRunning?: string | null
  experience?: string | null
  education?: string | null
  coreValues?: string | null
  politicalLean?: string | null
  voiceTone?: string | null
  district?: string | null
  state?: string | null
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

function profileBlock(p: WebsiteProfile): string {
  const lines: string[] = [
    `Name: ${p.candidateName}`,
    `Running for: ${p.office}${p.district ? ` (${p.district})` : ""}${p.state ? `, ${p.state}` : ""}`,
  ]
  if (p.party) lines.push(`Party: ${p.party}`)
  if (p.tagline) lines.push(`Tagline: ${p.tagline}`)
  if (p.bio) lines.push(`Bio: ${p.bio}`)
  if (p.whyRunning) lines.push(`Why running: ${p.whyRunning}`)
  if (p.experience) lines.push(`Experience: ${p.experience}`)
  if (p.education) lines.push(`Education: ${p.education}`)
  if (p.coreValues) lines.push(`Core values: ${p.coreValues}`)
  if (p.politicalLean) lines.push(`Positions/lean: ${p.politicalLean}`)
  if (p.voiceTone) lines.push(`Preferred voice/tone: ${p.voiceTone}`)
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
  "copy grounded in the candidate's real profile — concrete over abstract, genuine over platitudes, " +
  "and never inventing biographical facts or policy positions that aren't supported by the material. " +
  "Write the About section as a warm third-person narrative; write hero and issue copy in the " +
  "candidate's own confident voice. Return ONLY valid JSON — no markdown fences, no commentary."

export async function generateWebsiteDraft(
  profile: WebsiteProfile,
  positions: IssueSource[],
  topics: TopicSource[]
): Promise<WebsiteDraft> {
  const user = `Write the website copy for this candidate. Return a single JSON object with EXACTLY these keys:

{
  "heroHeadline": "punchy homepage headline, 8 words or fewer",
  "heroSubhead": "1-2 sentences under the headline",
  "aboutHeading": "short heading for the About section",
  "aboutBody": "2-4 short paragraphs, warm third-person bio (separate paragraphs with \\n\\n)",
  "issuesIntro": "1-2 sentence intro to the issues section",
  "issues": [ { "title": "issue name", "body": "1-2 short paragraphs in the candidate's voice" } ],
  "volunteerIntro": "1-2 sentences inviting people to get involved"
}

Produce 3 to 6 issues, drawn from the source material below (do not invent positions the material doesn't support).

CANDIDATE PROFILE
${profileBlock(profile)}

ISSUE SOURCE MATERIAL
${materialBlock(positions, topics)}`

  const res = await anthropic.messages.create({
    model: WEBSITE_MODEL,
    max_tokens: 2500,
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
    issuesIntro: str(o.issuesIntro),
    issues,
    volunteerIntro: str(o.volunteerIntro),
  }
}
