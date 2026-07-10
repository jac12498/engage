import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

/** The signed-in user's campaign id, or null. */
async function currentCampaignId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  return campaign?.id ?? null
}

async function currentSiteId(campaignId: string): Promise<string | null> {
  const site = await prisma.website.findUnique({
    where: { campaignId },
    select: { id: true },
  })
  return site?.id ?? null
}

// Upload / replace the headshot for the signed-in user's website.
export async function POST(req: Request) {
  const campaignId = await currentCampaignId()
  if (!campaignId) return new Response("Unauthorized", { status: 401 })
  const siteId = await currentSiteId(campaignId)
  if (!siteId) return new Response("No website found", { status: 404 })

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
    return new Response("Image too large. Maximum size is 3 MB.", { status: 413 })
  }

  const data = Buffer.from(await file.arrayBuffer())
  await prisma.website.update({
    where: { id: siteId },
    data: { headshotData: data, headshotMime: file.type },
  })

  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
  return Response.json({ ok: true })
}

// Remove the headshot.
export async function DELETE() {
  const campaignId = await currentCampaignId()
  if (!campaignId) return new Response("Unauthorized", { status: 401 })
  const siteId = await currentSiteId(campaignId)
  if (!siteId) return new Response("No website found", { status: 404 })

  await prisma.website.update({
    where: { id: siteId },
    data: { headshotData: null, headshotMime: null },
  })

  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
  return Response.json({ ok: true })
}
