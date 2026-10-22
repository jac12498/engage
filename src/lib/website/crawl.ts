import "server-only"

/**
 * Shared website crawler — fetches the readable text of a site's pages, same-host,
 * robots-aware, SSRF-guarded, and budget-bounded. Used by AI-Communications website
 * references AND by website import. Pure crawling only: metering (consumeCrawl /
 * refundCrawl) is the caller's job so each surface enforces its own cap.
 */

export interface CrawledPage {
  url: string
  title: string
  /** Flattened plain text (used by AI-Communications summaries). */
  text: string
  /** Structure-preserving extraction: headings (#/##/###), list items (-), and
   *  image refs (![alt](absolute-url)). Used by website import for clean section
   *  boundaries. */
  markdown: string
}
export type CrawlResult =
  | { ok: true; host: string; origin: string; pages: CrawledPage[] }
  | { ok: false; error: string; status: number }

const DEFAULT_MAX_PAGES = 20
const DEFAULT_MAX_DEPTH = 2
const TOTAL_BUDGET_MS = 55_000
const PER_FETCH_MS = 10_000
const POLITENESS_MS = 250
const PER_PAGE_CHARS = 8_000
const TOTAL_CHARS = 60_000

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|svg|webp|mp4|mp3|zip|gz|docx?|xlsx?|pptx?|css|js|ico|woff2?)($|\?)/i

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

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

/** Strip inline tags from a heading/list cell and collapse whitespace. */
function inlineText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/**
 * Convert a page's HTML to a lightweight markdown that preserves the structure the
 * mapper needs: section headings, list items, and image references (resolved to
 * absolute URLs). Regex-based (no DOM) but ordered so tags become structure before
 * the final strip.
 */
function htmlToMarkdown(html: string, baseUrl: string): string {
  let s = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")

  // images → ![alt](absolute-src)
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1]
    if (!src) return " "
    let abs: string
    try {
      abs = new URL(src, baseUrl).href
    } catch {
      return " "
    }
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? ""
    return `\n![${inlineText(alt)}](${abs})\n`
  })

  // headings
  s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n\n# ${inlineText(t)}\n`)
  s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n\n## ${inlineText(t)}\n`)
  s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n### ${inlineText(t)}\n`)
  s = s.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_, t) => `\n\n#### ${inlineText(t)}\n`)

  // list items
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `\n- ${inlineText(t)}`)

  // block-level ends → newlines
  s = s.replace(/<\/(p|div|section|article|header|footer|tr|ul|ol|table)>/gi, "\n")
  s = s.replace(/<br\s*\/?>/gi, "\n")

  // strip remaining tags + decode + tidy
  s = decodeEntities(s.replace(/<[^>]+>/g, " "))
  return s
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Block localhost / private / metadata hosts to avoid SSRF. */
export function isPublicHost(host: string): boolean {
  const h = host.toLowerCase()
  if (h === "localhost" || h.endsWith(".local") || h === "0.0.0.0") return false
  if (h === "127.0.0.1" || h === "::1" || h === "169.254.169.254") return false
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false
  return true
}

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

export async function crawlSite(
  url: string,
  opts: { maxPages?: number; maxDepth?: number } = {}
): Promise<CrawlResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { ok: false, error: "A valid http(s) URL is required.", status: 400 }
  }
  let root: URL
  try {
    root = new URL(url)
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL.", status: 400 }
  }
  if (!isPublicHost(root.hostname)) {
    return { ok: false, error: "That host isn't allowed.", status: 400 }
  }

  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH

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
  const pages: CrawledPage[] = []
  let totalChars = 0

  while (queue.length && pages.length < maxPages && Date.now() - started < TOTAL_BUDGET_MS) {
    const { url: pageUrl, depth } = queue.shift()!
    const html = await fetchText(pageUrl)
    if (html) {
      const text = stripHtml(html).slice(0, PER_PAGE_CHARS)
      if (text.length > 60) {
        const markdown = htmlToMarkdown(html, pageUrl).slice(0, PER_PAGE_CHARS)
        pages.push({ url: pageUrl, title: pageTitle(html), text, markdown })
        totalChars += text.length
      }
      if (depth < maxDepth && totalChars < TOTAL_CHARS) {
        const hrefs = [...html.matchAll(/href\s*=\s*["']([^"'#]+)["']/gi)].map((m) => m[1])
        for (const href of hrefs) {
          if (/^(mailto:|tel:|javascript:)/i.test(href)) continue
          let next: URL
          try {
            next = new URL(href, pageUrl)
          } catch {
            continue
          }
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
    return { ok: false, error: "Couldn't read any pages from that site.", status: 422 }
  }
  return { ok: true, host: root.hostname, origin: root.origin, pages }
}

/** Join crawled pages' flat text into a single labeled blob, capped for the model. */
export function crawledToText(pages: CrawledPage[], cap = TOTAL_CHARS): string {
  return pages
    .map((p) => `## ${p.title || p.url}\n${p.text}`)
    .join("\n\n")
    .slice(0, cap)
}

/** Join crawled pages' structured markdown into one blob, page-delimited, for import. */
export function crawledToMarkdown(pages: CrawledPage[], cap = TOTAL_CHARS): string {
  return pages
    .map((p) => `=== PAGE: ${p.title || p.url} (${p.url}) ===\n${p.markdown}`)
    .join("\n\n")
    .slice(0, cap)
}
