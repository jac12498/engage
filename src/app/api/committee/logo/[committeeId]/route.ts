import { prisma } from "@/lib/prisma"

// Public: streams a committee's uploaded logo straight from the DB. committeeId is an
// unguessable cuid; served regardless of publish state so the builder can preview it.
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  const { committeeId } = await params
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: { logoData: true, logoMime: true },
  })
  if (!committee?.logoData || !committee.logoMime) {
    return new Response("Not found", { status: 404 })
  }

  const body = Buffer.from(committee.logoData)
  return new Response(body, {
    headers: {
      "Content-Type": committee.logoMime,
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=60",
    },
  })
}
