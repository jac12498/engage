import "server-only"
import { anthropic } from "@/lib/comms/anthropic"
import { draftingThinking } from "@/lib/comms/prompts"
import { describeBlockVocabulary } from "@/lib/website/agentTools"
import { extractJson } from "@/lib/website/generate"
import { normalizePrototype, type SitePrototype } from "@/lib/website/prototype"
import { crawledToMarkdown, type CrawledPage } from "@/lib/website/crawl"
import { fetchAndStoreImage } from "@/lib/website/imageStore"

// Map a crawled external website into our SitePrototype — the AI half of website
// import. It only reshapes the site's OWN content into our block vocabulary (it never
// invents), and everything it returns is re-validated by `normalizePrototype`, so the
// result is always a safe prototype ready to store or instantiate.
const MODEL = "claude-sonnet-5"

const SYSTEM =
  "You are a website migration assistant. You convert an EXISTING website's content into a structured " +
  "site built from a fixed set of block types, preserving the site's real words and structure and NEVER " +
  "inventing facts, positions, or endorsements. Return ONLY valid JSON — no markdown fences, no commentary."

export async function mapSiteToPrototype(input: {
  host: string
  pages: CrawledPage[]
}): Promise<SitePrototype> {
  const content = crawledToMarkdown(input.pages)

  const user = `Convert this existing website into our page/block format.

Return a single JSON object:
{
  "meta": { "name": "<the site/organization name>", "appliesTo": "party" | "candidate" | "any" },
  "pages": [
    { "title": "<page title>", "slug": "<url-safe slug; use 'home' for the homepage>",
      "isHome": <true for EXACTLY one page>,
      "blocks": [ { "type": "<block type>", "props": { ...props matching that block's shape } } ] }
  ]
}

The source content below is delimited by "=== PAGE: … ===" markers and uses markdown structure: "#"/"##"/"###" are the site's real section headings, "-" are list items, and "![alt](url)" are images. Use the headings to decide page and block boundaries.

IMAGES
- You MAY use the site's own images. Set a page's hero "imageUrl" to its most prominent banner/lead photo, and add "image" blocks (with the exact url, and the alt text as "alt") for other meaningful photos.
- Use the EXACT url from the "![alt](url)" markup. Skip logos, icons, sprites, spacers, and tiny/decorative images. Do not invent image URLs.

RULES
- Map each meaningful source page (each "=== PAGE ===") to one of our pages; the homepage is isHome:true, slug "home".
- Use the markdown headings as section boundaries: each "#/##" heading generally starts a new block. Break each page's content into blocks using ONLY the block types below. Put a page's lead/banner in "hero", prose in "richText", a list of issues/positions in "issuesGrid", endorsements in "endorsements", FAQs in "faq", events in "events".
- PRESERVE the site's actual text — headlines, paragraphs, issue titles and descriptions. Do NOT invent content, positions, endorsements, or statistics. If a page is thin, produce fewer blocks rather than padding.
- The dynamic blocks (candidates, newsFeed, pressMentions, newsletterArchive) auto-populate — use them only where the source clearly has that kind of section, and set only their heading/intro.
- Keep it to at most ~6 pages and ~8 blocks per page.

BLOCK VOCABULARY
${describeBlockVocabulary()}

EXISTING SITE (${input.host})
${content}`

  const thinking = draftingThinking(MODEL)
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    ...(thinking ? { thinking } : {}),
    system: SYSTEM,
    messages: [{ role: "user", content: user }],
  })

  let text = ""
  for (const b of res.content) if (b.type === "text") text += b.text

  const raw = extractJson(text)
  if (raw === null) {
    throw new Error("Couldn't structure that site — the import returned malformed data. Try again.")
  }
  return normalizePrototype(raw)
}

const MAX_IMPORT_IMAGES = 8

/**
 * Download the external images the mapper referenced (hero imageUrl + image blocks),
 * store our own copies, and rewrite the prototype to point at the stored URLs. Images
 * that can't be fetched are dropped. Mutates + returns the prototype. Bounded so a
 * heavy site can't stall the import.
 */
export async function importPrototypeImages(
  committeeId: string,
  proto: SitePrototype
): Promise<SitePrototype> {
  const cache = new Map<string, string | null>() // original URL → stored URL (or null = failed)
  let used = 0

  const resolve = async (original: string): Promise<string | null> => {
    if (!/^https?:\/\//i.test(original)) return null
    if (cache.has(original)) return cache.get(original)!
    if (used >= MAX_IMPORT_IMAGES) return null
    used += 1
    const stored = await fetchAndStoreImage(committeeId, original)
    cache.set(original, stored)
    return stored
  }

  for (const page of proto.pages) {
    for (const block of page.blocks) {
      const p = block.props as Record<string, unknown>
      if (block.type === "hero" && typeof p.imageUrl === "string" && p.imageUrl) {
        const stored = await resolve(p.imageUrl)
        if (stored) p.imageUrl = stored
        else delete p.imageUrl
      } else if (block.type === "image" && typeof p.url === "string" && p.url) {
        p.url = (await resolve(p.url)) ?? ""
      }
    }
    // Drop image blocks whose download failed (empty url → nothing to show).
    page.blocks = page.blocks.filter(
      (b) => b.type !== "image" || (typeof (b.props as Record<string, unknown>).url === "string" && (b.props as Record<string, unknown>).url)
    )
  }
  return proto
}
