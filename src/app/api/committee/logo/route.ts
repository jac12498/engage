import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getActiveContext, roleAtLeast } from "@/lib/context"

const MAX_BYTES = 3 * 1024 * 1024 // 3 MB
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"])

/** The active committee id if the caller may edit it (admin+), else null. */
async function editableCommitteeId(): Promise<string | null> {
  const ctx = await getActiveContext()
  if (!ctx || !roleAtLeast(ctx.role, "admin")) return null
  return ctx.committee.id
}

// Upload / replace the active committee's logo (admin+ only).
export async function POST(req: Request) {
  const committeeId = await editableCommitteeId()
  if (!committeeId) return new Response("Unauthorized", { status: 401 })

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
  await prisma.committee.update({
    where: { id: committeeId },
    data: { logoData: data, logoMime: file.type },
  })

  revalidatePath("/committees/settings")
  revalidatePath(`/websites/${committeeId}`)
  return Response.json({ ok: true })
}

// Remove the committee logo.
export async function DELETE() {
  const committeeId = await editableCommitteeId()
  if (!committeeId) return new Response("Unauthorized", { status: 401 })

  await prisma.committee.update({
    where: { id: committeeId },
    data: { logoData: null, logoMime: null },
  })

  revalidatePath("/committees/settings")
  revalidatePath(`/websites/${committeeId}`)
  return Response.json({ ok: true })
}
