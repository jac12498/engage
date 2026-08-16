import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

// Upload an image for a newsletter image block. Stored in-DB; returns a stable
// path (/api/newsletter/image/[id]) that email clients can fetch.
export async function POST(req: Request) {
  const ctx = await getActiveContext()
  if (!ctx) return new Response("Unauthorized", { status: 401 })
  const campaign = ctx.campaign
  if (!campaign) return new Response("No campaign", { status: 404 })

  let file: File | null = null
  try {
    const form = await req.formData()
    const f = form.get("file")
    if (f instanceof File) file = f
  } catch {
    return new Response("Bad request", { status: 400 })
  }
  if (!file) return new Response("No file provided.", { status: 400 })
  if (!ALLOWED.has(file.type)) {
    return new Response("Unsupported image type. Use PNG, JPEG, WebP, or GIF.", { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return new Response("Image too large. Maximum size is 5 MB.", { status: 413 })
  }

  const data = Buffer.from(await file.arrayBuffer())
  const img = await prisma.newsletterImage.create({
    data: { campaignId: campaign.id, data, mime: file.type },
    select: { id: true },
  })
  return Response.json({ url: `/api/newsletter/image/${img.id}` })
}
