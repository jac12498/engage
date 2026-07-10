import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { loadPublicSite } from "./_render/site"
import { PublicSite } from "./_render/PublicSite"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string }>
}): Promise<Metadata> {
  const { campaignId } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) return { title: "Not found" }
  const name = site.campaign.candidateName
  return {
    title: `${name} for ${site.campaign.office}`,
    description: `Official campaign site for ${name}.`,
  }
}

export default async function PublicSiteHome({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) notFound()

  const home = site.pages.find((p) => p.isHome && p.published)
  if (!home) notFound()

  return <PublicSite site={site} activePage={home} />
}
