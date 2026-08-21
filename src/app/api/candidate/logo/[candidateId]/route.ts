import { prisma } from "@/lib/prisma"

// Public: streams a candidate's uploaded logo straight from the DB. Served regardless
// of publish state so the authenticated builder can preview it too; candidateId is an
// unguessable cuid.
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { logoData: true, logoMime: true },
  })
  if (!candidate?.logoData || !candidate.logoMime) {
    return new Response("Not found", { status: 404 })
  }

  const body = Buffer.from(candidate.logoData)
  return new Response(body, {
    headers: {
      "Content-Type": candidate.logoMime,
      "Content-Length": String(body.length),
      // Short cache; the builder busts it with ?v= after an upload.
      "Cache-Control": "public, max-age=60",
    },
  })
}
