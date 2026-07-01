import { auth } from "@/lib/auth"
import { anthropic } from "@/lib/comms/anthropic"
import { DEFAULT_AI_MODEL } from "@/lib/entitlements"

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

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 })

  const { url } = (await req.json()) as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "A valid http(s) URL is required." }, { status: 400 })
  }

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
    return Response.json(
      { error: "Could not fetch that URL. Paste the article text instead." },
      { status: 422 }
    )
  }

  if (pageText.length < 80) {
    return Response.json(
      { error: "Couldn't read enough text from that page. Paste the article text instead." },
      { status: 422 }
    )
  }

  const msg = await anthropic.messages.create({
    model: DEFAULT_AI_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are summarizing a news article for a political campaign's records.
Return ONLY a JSON object: {"title": string, "source": string, "summary": string}
- title: the article headline
- source: the publication/outlet name (empty string if unknown)
- summary: 2-3 sentences capturing what happened and any quote or position relevant to a candidate.

URL: ${url}
Page <title>: ${fetchedTitle}

Article text:
${pageText}`,
      },
    ],
  })

  const raw = msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")

  // Tolerant parse: extract the first {...} block.
  let parsed: { title?: string; source?: string; summary?: string } = {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {
    parsed = {}
  }

  return Response.json({
    title: (parsed.title || fetchedTitle || "").trim(),
    source: (parsed.source || "").trim(),
    summary: (parsed.summary || raw).trim(),
    url,
  })
}
