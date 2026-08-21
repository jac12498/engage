import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext } from "@/lib/context"

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"])

/** The active candidate id, or null. The logo lives on the Candidate (an asset). */
async function currentCandidateId(): Promise<string | null> {
  const ctx = await getActiveContext()
  return ctx?.candidate?.id ?? null
}

// Upload / replace the campaign logo for the signed-in user's candidate.
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
    return new Response("Unsupported image type. Use PNG, JPEG, WebP, GIF, or SVG.", { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return new Response("Image too large. Maximum size is 3 MB.", { status: 413 })
  }

  const data = Buffer.from(await file.arrayBuffer())
  await prisma.candidate.update({
    where: { id: candidateId },
    data: { logoData: data, logoMime: file.type },
  })

  revalidatePath("/settings")
  revalidatePath(`/websites/${candidateId}`)
  return Response.json({ ok: true })
}

// Remove the logo.
export async function DELETE() {
  const candidateId = await currentCandidateId()
  if (!candidateId) return new Response("Unauthorized", { status: 401 })

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { logoData: null, logoMime: null },
  })

  revalidatePath("/settings")
  revalidatePath(`/websites/${candidateId}`)
  return Response.json({ ok: true })
}
