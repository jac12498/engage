import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

/** The active candidate id, or null. The headshot lives on the Candidate (the person). */
async function currentCandidateId(): Promise<string | null> {
  const ctx = await getActiveContext()
  return ctx?.candidate?.id ?? null
}

// Upload / replace the candidate headshot for the signed-in user's candidate.
// Headshot lives on the Candidate (part of the profile), so no website is required.
export async function POST(req: Request) {
  const candidateId = await currentCandidateId()
  if (!candidateId) return new Response("Unauthorized", { status: 401 })

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
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { headshotData: data, headshotMime: file.type },
  })

  revalidatePath("/settings")
  revalidatePath("/website")
  revalidatePath(`/websites/${candidateId}`)
  return Response.json({ ok: true })
}

// Remove the headshot.
export async function DELETE() {
  const candidateId = await currentCandidateId()
  if (!candidateId) return new Response("Unauthorized", { status: 401 })

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { headshotData: null, headshotMime: null },
  })

  revalidatePath("/settings")
  revalidatePath("/website")
  revalidatePath(`/websites/${candidateId}`)
  return Response.json({ ok: true })
}
