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
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { headshotData: true, headshotMime: true },
  })
  if (!campaign?.headshotData || !campaign.headshotMime) {
    return new Response("Not found", { status: 404 })
  }

  const body = Buffer.from(campaign.headshotData)
  return new Response(body, {
    headers: {
      "Content-Type": campaign.headshotMime,
      "Content-Length": String(body.length),
      // Short cache; the builder busts it with ?v= after an upload.
      "Cache-Control": "public, max-age=60",
    },
  })
}
