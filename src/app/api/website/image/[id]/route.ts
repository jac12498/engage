import { prisma } from "@/lib/prisma"

// Public: streams a stored website image straight from the DB. The id is an
// unguessable cuid; served regardless of site publish state so the builder can
// preview it. Images are immutable once stored, so they cache aggressively.
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const image = await prisma.websiteImage.findUnique({
    where: { id },
    select: { data: true, mime: true },
  })
  if (!image?.data || !image.mime) {
    return new Response("Not found", { status: 404 })
  }

  const body = Buffer.from(image.data)
  return new Response(body, {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
