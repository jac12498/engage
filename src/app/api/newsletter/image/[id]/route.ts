import { prisma } from "@/lib/prisma"

// Public: streams an uploaded newsletter image straight from the DB. Images are
// immutable (a new id per upload) so they cache aggressively; the id is an
// unguessable cuid.
export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const img = await prisma.newsletterImage.findUnique({
    where: { id },
    select: { data: true, mime: true },
  })
  if (!img) return new Response("Not found", { status: 404 })

  const body = Buffer.from(img.data)
  return new Response(body, {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
