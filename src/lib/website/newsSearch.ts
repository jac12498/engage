import "server-only"
import type Anthropic from "@anthropic-ai/sdk"
import { anthropic } from "@/lib/comms/anthropic"
import { draftingThinking } from "@/lib/comms/prompts"

// Discovery for the "In the News" feature. Uses Claude's server-side web-search
// tool so results come back with REAL source URLs (a model asked to "list articles"
// from memory will invent plausible-but-fake links). Everything returned here is a
// candidate for the review queue — never auto-published.
const SEARCH_MODEL = "claude-sonnet-5" // supports the web-search server tool
const SUMMARIZE_MODEL = "claude-haiku-4-5"

export interface FoundClip {
  headline: string
  url: string
  outlet?: string
  summary?: string
  publishedAt?: string // ISO 8601 date, or "" when unknown
}

export interface CandidateQuery {
  candidateName: string
  office: string
  district?: string | null
  state?: string | null
  party?: string | null
  committeeName?: string | null
  context?: string | null // short blurb (tagline / bio) to disambiguate common names
  keywords?: string | null // optional user-supplied terms / topics / outlets to steer the search
}

/** Tolerant JSON-array extraction: first `[` … last `]`, parsed leniently. */
function parseArray(text: string): unknown[] {
  const start = text.indexOf("[")
  const end = text.lastIndexOf("]")
  if (start === -1 || end === -1 || end <= start) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function httpUrl(v: unknown): string | null {
  if (typeof v !== "string") return null
  try {
    const u = new URL(v.trim())
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

function isoDate(v: unknown): string {
  if (typeof v !== "string") return ""
  const d = new Date(v.trim())
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10)
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim()
}

/**
 * Search the web for recent press coverage about the candidate. Returns up to ~10
 * clips (deduped and http-validated). Never throws for "no results" — returns [].
 */
export async function searchCandidateNews(q: CandidateQuery): Promise<FoundClip[]> {
  const who = [
    q.candidateName,
    `who is running for ${q.office}`,
    q.district ? `(${q.district})` : "",
    q.state ? `in ${q.state}` : "",
  ]
    .filter(Boolean)
    .join(" ")

  // Identity context is what disambiguates a common name ("Jeff Collins") — pass
  // whatever the profile has so the search confirms the right person.
  const contextLines = [
    q.party ? `Party: ${q.party}` : "",
    q.committeeName ? `Campaign committee: ${q.committeeName}` : "",
    q.context ? `About: ${q.context}` : "",
  ]
    .filter(Boolean)
    .join("\n")

  const hints = typeof q.keywords === "string" ? q.keywords.trim() : ""

  const prompt = `Use web search to find recent news articles and press coverage about ${who}.
${contextLines ? `\nCandidate context (use this to confirm identity and rule out other people with the same name):\n${contextLines}\n` : ""}${hints ? `\nThe campaign suggests these search terms, topics, or outlets — weave them into your searches to surface ADDITIONAL coverage (results must still be genuine journalism about THIS candidate):\n${hints}\n` : ""}
Search local and regional outlets, not just national ones. Only include genuine journalism — articles from news outlets, local papers, TV/radio sites, or nonprofit newsrooms that mention this candidate. EXCLUDE the candidate's own website, campaign press releases hosted on their site, social media posts, actblue/winred pages, and directory/aggregator stubs. Be careful about people with the same name: prefer results whose context matches this office and place.

Return ONLY a JSON array (no prose, no markdown fences), up to 10 items, each:
{"headline": string, "url": string (the real article URL from the search results), "outlet": string (publication name, "" if unknown), "publishedDate": string (ISO date like "2026-05-14", "" if unknown), "summary": string (1-2 sentences on what the article says about the candidate)}

If you find no genuine coverage, return [].`

  const tools = [
    { type: "web_search_20260209", name: "web_search", max_uses: 5 },
  ] as unknown as Anthropic.Messages.ToolUnion[]

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }]

  // Server-tool loop: the API runs web search internally and may `pause_turn`
  // if it hits the per-request tool-iteration cap — re-send to resume.
  const thinking = draftingThinking(SEARCH_MODEL)
  let final: Anthropic.Message | null = null
  for (let i = 0; i < 5; i++) {
    const res = await anthropic.messages.create({
      model: SEARCH_MODEL,
      max_tokens: 2048,
      ...(thinking ? { thinking } : {}),
      tools,
      messages,
    })
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content })
      continue
    }
    final = res
    break
  }
  if (!final) return []

  const rows = parseArray(textOf(final))
  const out: FoundClip[] = []
  const seen = new Set<string>()
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue
    const r = raw as Record<string, unknown>
    const url = httpUrl(r.url)
    const headline = typeof r.headline === "string" ? r.headline.trim().slice(0, 300) : ""
    if (!url || !headline || seen.has(url)) continue
    seen.add(url)
    out.push({
      headline,
      url,
      outlet: typeof r.outlet === "string" ? r.outlet.trim().slice(0, 160) || undefined : undefined,
      summary: typeof r.summary === "string" ? r.summary.trim().slice(0, 1000) || undefined : undefined,
      publishedAt: isoDate(r.publishedDate) || undefined,
    })
    if (out.length >= 12) break
  }
  return out
}

/** Crude HTML → text: drop scripts/styles/tags, decode a few entities, collapse space. */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export interface ArticleSummary {
  headline: string
  outlet?: string
  summary?: string
  publishedAt?: string
}

/**
 * Fetch a single article URL and summarize it (for the manual "Add by URL" path).
 * Returns null if the page can't be read. Mirrors the AI-Comms news/summarize route.
 */
export async function summarizeArticleUrl(url: string): Promise<ArticleSummary | null> {
  let pageText = ""
  let fetchedTitle = ""
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EngageCampaign/1.0)" },
      signal: AbortSignal.timeout(10000),
    })
    const html = await res.text()
    fetchedTitle = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim()
    pageText = stripHtml(html).slice(0, 12000)
  } catch {
    return null
  }
  if (pageText.length < 80) return null

  const msg = await anthropic.messages.create({
    model: SUMMARIZE_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Summarize this news article for a political campaign's press page.
Return ONLY a JSON object: {"headline": string, "outlet": string, "summary": string}
- headline: the article headline
- outlet: the publication/outlet name ("" if unknown)
- summary: 1-2 sentences on what the article says.

URL: ${url}
Page <title>: ${fetchedTitle}

Article text:
${pageText}`,
      },
    ],
  })

  const rawText = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  const start = rawText.indexOf("{")
  const end = rawText.lastIndexOf("}")
  let parsed: { headline?: string; outlet?: string; summary?: string } = {}
  if (start !== -1 && end > start) {
    try {
      parsed = JSON.parse(rawText.slice(start, end + 1))
    } catch {
      parsed = {}
    }
  }
  const headline =
    (typeof parsed.headline === "string" && parsed.headline.trim()) || fetchedTitle || "Press coverage"
  return {
    headline: headline.slice(0, 300),
    outlet: typeof parsed.outlet === "string" ? parsed.outlet.trim().slice(0, 160) || undefined : undefined,
    summary: typeof parsed.summary === "string" ? parsed.summary.trim().slice(0, 1000) || undefined : undefined,
  }
}
