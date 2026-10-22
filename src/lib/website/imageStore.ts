import "server-only"
import { prisma } from "@/lib/prisma"
import { isPublicHost } from "@/lib/website/crawl"

// Store website images in-DB (served via /api/website/image/[id]). Used by import
// (download from the source site) and by builder uploads. Raster types only —
// SVG is excluded (it can carry active content), and everything is size-capped.

const MAX_BYTES = 3_000_000
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

/** Download an external image and store it. Returns the internal serving URL, or null. */
export async function fetchAndStoreImage(
  committeeId: string,
  url: string,
  alt?: string
): Promise<string | null> {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null
  if (!isPublicHost(u.hostname)) return null // SSRF guard

  let res: Response
  try {
    res = await fetch(u.href, {
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EngageCampaign/1.0)" },
    })
  } catch {
    return null
  }
  if (!res.ok) return null
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase()
  if (!ALLOWED.has(mime)) return null

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length === 0 || buf.length > MAX_BYTES) return null

  return store(committeeId, buf, mime, alt, u.href)
}

/** Store raw image bytes (uploaded in the builder). Returns the internal serving URL, or null. */
export async function storeImageBytes(
  committeeId: string,
  bytes: Buffer,
  mime: string,
  alt?: string
): Promise<string | null> {
  const m = mime.split(";")[0].trim().toLowerCase()
  if (!ALLOWED.has(m)) return null
  if (bytes.length === 0 || bytes.length > MAX_BYTES) return null
  return store(committeeId, bytes, m, alt)
}

async function store(
  committeeId: string,
  data: Buffer,
  mime: string,
  alt?: string,
  sourceUrl?: string
): Promise<string> {
  const row = await prisma.websiteImage.create({
    data: {
      committeeId,
      data: new Uint8Array(data),
      mime,
      alt: alt?.slice(0, 300) || null,
      sourceUrl: sourceUrl?.slice(0, 2000) || null,
    },
    select: { id: true },
  })
  return `/api/website/image/${row.id}`
}
