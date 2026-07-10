import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { loadPublicSite } from "../_render/site"
import { PublicSite } from "../_render/PublicSite"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; pageSlug: string }>
}): Promise<Metadata> {
  const { campaignId, pageSlug } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) return { title: "Not found" }
  const page = site.pages.find((p) => p.slug === pageSlug && p.published)
  if (!page) return { title: "Not found" }
  return { title: `${page.title} — ${site.campaign.candidateName}` }
}

export default async function PublicSitePage({
  params,
}: {
  params: Promise<{ campaignId: string; pageSlug: string }>
}) {
  const { campaignId, pageSlug } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) notFound()

  const page = site.pages.find((p) => p.slug === pageSlug && p.published)
  // The home page is served at the root; don't also serve it under its slug.
  if (!page || page.isHome) notFound()

  return <PublicSite site={site} activePage={page} />
}
