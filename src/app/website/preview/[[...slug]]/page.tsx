import { redirect, notFound } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { loadPublicSite } from "@/app/websites/[campaignId]/_render/site"
import { PublicSite } from "@/app/websites/[campaignId]/_render/PublicSite"

// Owner-only live preview of the (possibly unpublished) draft, rendered with the exact
// public renderer so what the candidate sees here is what visitors will get. Session-
// gated to the site's owner; shown in the builder's preview iframe.
export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } }

export default async function WebsitePreview({
  params,
}: {
  params: Promise<{ slug?: string[] }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })
  if (!campaign) redirect("/onboarding")

  const site = await loadPublicSite(campaign.id)
  if (!site) notFound()

  const { slug } = await params
  const pageSlug = slug?.[0]
  const page = pageSlug
    ? site.pages.find((p) => p.slug === pageSlug)
    : site.pages.find((p) => p.isHome) ?? site.pages[0]
  if (!page) notFound()

  return <PublicSite site={site} activePage={page} />
}
