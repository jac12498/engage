import { getActiveContext } from "@/lib/context"
import { anthropic } from "@/lib/comms/anthropic"
import { DEFAULT_AI_MODEL, toPlanId } from "@/lib/entitlements"
import { consumeCrawl, refundCrawl } from "@/lib/comms/usage"
import { crawlSite, crawledToText } from "@/lib/website/crawl"

export async function POST(req: Request) {
  const ctx = await getActiveContext()
  if (!ctx) return new Response("Unauthorized", { status: 401 })

  const { url } = (await req.json()) as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "A valid http(s) URL is required." }, { status: 400 })
  }

  // Enforce the monthly crawl cap before doing any expensive work.
  const { committee, campaign } = ctx
  if (!campaign) return new Response("No campaign found", { status: 404 })
  const consumed = await consumeCrawl(toPlanId(committee.plan), committee)
  if (!consumed.ok) {
    return Response.json(
      {
        error: `You've used all ${consumed.limit} website crawls this month. Upgrade for more, or use a single URL or PDF.`,
      },
      { status: 429 }
    )
  }

  const crawl = await crawlSite(url)
  if (!crawl.ok) {
    await refundCrawl(committee.id) // nothing read — don't charge for it
    return Response.json({ error: crawl.error }, { status: crawl.status })
  }

  const combined = crawledToText(crawl.pages)

  const msg = await anthropic.messages.create({
    model: DEFAULT_AI_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are summarizing a website for a political campaign's records. Below is text from ${crawl.pages.length} page(s) of ${crawl.host}.
Return ONLY a JSON object: {"title": string, "source": string, "summary": string}
- title: the site or organization name
- source: "${crawl.host}"
- summary: 4-6 sentences covering what this site is about and the facts, figures, and positions relevant to a candidate.

${combined}`,
      },
    ],
  })

  const raw = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("")
  let parsed: { title?: string; source?: string; summary?: string } = {}
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) parsed = JSON.parse(match[0])
  } catch {
    parsed = {}
  }

  return Response.json({
    title: (parsed.title || crawl.host).trim(),
    source: (parsed.source || crawl.host).trim(),
    summary: (parsed.summary || raw).trim(),
    url,
    pageCount: crawl.pages.length,
  })
}
