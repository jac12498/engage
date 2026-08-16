import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"
import { anthropic } from "@/lib/comms/anthropic"
import { DEFAULT_AI_MODEL, toPlanId } from "@/lib/entitlements"
import { consumeCrawl, refundCrawl } from "@/lib/comms/usage"

const MAX_PAGES = 20
const MAX_DEPTH = 2
const TOTAL_BUDGET_MS = 55_000
const PER_FETCH_MS = 10_000
const POLITENESS_MS = 250
const PER_PAGE_CHARS = 8_000
const TOTAL_CHARS = 60_000

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

function pageTitle(html: string): string {
  return (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim()
}

/** Block localhost / private / metadata hosts to avoid SSRF. */
function isPublicHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === "localhost" || h.endsWith(".local") || h === "0.0.0.0") return false
  if (h === "127.0.0.1" || h === "::1" || h === "169.254.169.254") return false
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
  return true
}

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|svg|webp|mp4|mp3|zip|gz|docx?|xlsx?|pptx?|css|js|ico|woff2?)($|\?)/i

/** Minimal robots.txt: collect Disallow prefixes under `User-agent: *`. */
function parseRobots(txt: string): string[] {
  const disallow: string[] = []
  let applies = false
  for (const raw of txt.split("\n")) {
    const line = raw.split("#")[0].trim()
    if (!line) continue
    const [rawKey, ...rest] = line.split(":")
    const key = rawKey.trim().toLowerCase()
    const val = rest.join(":").trim()
    if (key === "user-agent") applies = val === "*"
    else if (key === "disallow" && applies && val) disallow.push(val)
  }
  return disallow
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EngageCampaign/1.0)" },
      signal: AbortSignal.timeout(PER_FETCH_MS),
      redirect: "follow",
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") ?? ""
    if (!ct.includes("text/html")) return null
    return await res.text()
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const ctx = await getActiveContext()
  if (!ctx) return new Response("Unauthorized", { status: 401 })

  const { url } = (await req.json()) as { url?: string }
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "A valid http(s) URL is required." }, { status: 400 })
  }

  let root: URL
  try {
    root = new URL(url)
  } catch {
    return Response.json({ error: "That doesn't look like a valid URL." }, { status: 400 })
  }
  if (!isPublicHost(root.hostname)) {
    return Response.json({ error: "That host isn't allowed." }, { status: 400 })
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

  // robots.txt (best-effort).
  let disallow: string[] = []
  try {
    const r = await fetch(`${root.origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
    if (r.ok) disallow = parseRobots(await r.text())
  } catch {
    /* no robots — allow */
  }
  const allowed = (path: string) => !disallow.some((d) => path.startsWith(d))

  const started = Date.now()
  const queue: { url: string; depth: number }[] = [{ url: root.href, depth: 0 }]
  const seen = new Set<string>([root.pathname])
  const pages: { url: string; title: string; text: string }[] = []
  let totalChars = 0

  while (queue.length && pages.length < MAX_PAGES && Date.now() - started < TOTAL_BUDGET_MS) {
    const { url: pageUrl, depth } = queue.shift()!
    const html = await fetchText(pageUrl)
    if (html) {
      const text = stripHtml(html).slice(0, PER_PAGE_CHARS)
      if (text.length > 60) {
        pages.push({ url: pageUrl, title: pageTitle(html), text })
        totalChars += text.length
      }
      if (depth < MAX_DEPTH && totalChars < TOTAL_CHARS) {
        const hrefs = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1])
        for (const href of hrefs) {
          if (/^(mailto:|tel:|javascript:)/i.test(href)) continue
          let next: URL
          try {
            next = new URL(href, pageUrl)
          } catch {
            continue
          }
          // Same host (ignore http/https scheme differences); dedupe by path.
          if (next.hostname !== root.hostname) continue
          if (SKIP_EXT.test(next.pathname)) continue
          if (!allowed(next.pathname)) continue
          if (seen.has(next.pathname)) continue
          seen.add(next.pathname)
          queue.push({ url: next.href, depth: depth + 1 })
        }
      }
    }
    await new Promise((r) => setTimeout(r, POLITENESS_MS))
  }

  if (pages.length === 0) {
    await refundCrawl(committee.id) // nothing read — don't charge for it
    return Response.json(
      { error: "Couldn't read any pages from that site. Try the URL type, or paste the text." },
      { status: 422 }
    )
  }

  const combined = pages
    .map((p) => `## ${p.title || p.url}\n${p.text}`)
    .join("\n\n")
    .slice(0, TOTAL_CHARS)

  const msg = await anthropic.messages.create({
    model: DEFAULT_AI_MODEL,
    max_tokens: 800,
    messages: [
      {
        role: "user",
        content: `You are summarizing a website for a political campaign's records. Below is text from ${pages.length} page(s) of ${root.hostname}.
Return ONLY a JSON object: {"title": string, "source": string, "summary": string}
- title: the site or organization name
- source: "${root.hostname}"
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
    title: (parsed.title || root.hostname).trim(),
    source: (parsed.source || root.hostname).trim(),
    summary: (parsed.summary || raw).trim(),
    url: root.href,
    pageCount: pages.length,
  })
}
