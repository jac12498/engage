import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { allowsMultipleCandidates } from "@/lib/committeeTypes"
import { WEBSITE_EDIT_LIMITS, toPlanId, resolveModel } from "@/lib/entitlements"
import { CreateSitePanel } from "@/components/website/CreateSitePanel"
import { type EditorSite } from "@/components/website/WebsiteBuilder"
import { WebsiteWorkspace } from "@/components/website/WebsiteWorkspace"

export default async function WebsitePage() {
  // The website is committee-owned (2b-2); no active candidate is required.
  const { committee, candidate } = await requireActiveCampaign()
  const multiCandidate = allowsMultipleCandidates(committee.committeeType)

  const website = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    omit: { headshotData: true },
    include: {
      pages: {
        orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
        include: { blocks: { orderBy: { order: "asc" } } },
      },
      _count: { select: { signups: { where: { status: "pending" } } } },
    },
  })

  if (!website) {
    const person = candidate
      ? await prisma.candidate.findUnique({ where: { id: candidate.id }, select: { bio: true } })
      : null
    // `whyRunning` is committee-level grounding (Phase 1).
    return <CreateSitePanel committeeName={committee.name} thinProfile={!person?.bio && !committee.whyRunning} />
  }

  const s = website
  const site: EditorSite = {
    published: s.published,
    primaryColor: s.primaryColor,
    accentColor: s.accentColor,
    fontTheme: s.fontTheme,
    donateUrl: s.donateUrl ?? "",
    contactEmail: s.contactEmail ?? "",
    pages: s.pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      navOrder: p.navOrder,
      showInNav: p.showInNav,
      published: p.published,
      isHome: p.isHome,
      blocks: p.blocks.map((b) => ({
        id: b.id,
        type: b.type,
        order: b.order,
        props: (b.props ?? {}) as Record<string, unknown>,
      })),
    })),
  }

  const plan = toPlanId(committee.plan)
  const now = new Date()
  const bp = committee.billingPeriodStart
  const sameMonth =
    bp.getUTCFullYear() === now.getUTCFullYear() && bp.getUTCMonth() === now.getUTCMonth()
  const editsUsed = sameMonth ? committee.websiteEditsThisMonth : 0

  return (
    <WebsiteWorkspace
      committeeId={committee.id}
      multiCandidate={multiCandidate}
      site={site}
      pendingSignups={s._count.signups}
      editsUsed={editsUsed}
      editsLimit={WEBSITE_EDIT_LIMITS[plan]}
      defaultModel={resolveModel(committee.aiModel)}
    />
  )
}
