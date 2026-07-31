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

// Upload / replace the candidate headshot for the signed-in user's campaign.
// Headshot lives on Campaign (part of the profile), so no website is required.
export async function POST(req: Request) {
  const campaignId = await currentCampaignId()
  if (!campaignId) return new Response("Unauthorized", { status: 401 })

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
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { headshotData: data, headshotMime: file.type },
  })

  revalidatePath("/settings")
  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
  return Response.json({ ok: true })
}

// Remove the headshot.
export async function DELETE() {
  const campaignId = await currentCampaignId()
  if (!campaignId) return new Response("Unauthorized", { status: 401 })

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { headshotData: null, headshotMime: null },
  })

  revalidatePath("/settings")
  revalidatePath("/website")
  revalidatePath(`/websites/${campaignId}`)
  return Response.json({ ok: true })
}
