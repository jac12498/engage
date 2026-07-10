import { prisma } from "@/lib/prisma"

// Public: streams a candidate's uploaded headshot straight from the DB. Served
// regardless of publish state so the authenticated builder can preview it too;
// campaignId is an unguessable cuid.
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params
  const site = await prisma.website.findUnique({
    where: { campaignId },
    select: { headshotData: true, headshotMime: true },
  })
  if (!site?.headshotData || !site.headshotMime) {
    return new Response("Not found", { status: 404 })
  }

  const body = Buffer.from(site.headshotData)
  return new Response(body, {
    headers: {
      "Content-Type": site.headshotMime,
      "Content-Length": String(body.length),
      // Short cache; the builder busts it with ?v= after an upload.
      "Cache-Control": "public, max-age=60",
    },
  })
}
