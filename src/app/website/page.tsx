import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateSitePanel } from "@/components/website/CreateSitePanel"
import { WebsiteBuilder, type EditorSite } from "@/components/website/WebsiteBuilder"

export default async function WebsitePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      candidateName: true,
      office: true,
      bio: true,
      whyRunning: true,
      site: {
        omit: { headshotData: true }, // large; presence is tracked via headshotMime
        include: {
          pages: {
            orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
            include: { blocks: { orderBy: { order: "asc" } } },
          },
          _count: { select: { signups: { where: { status: "pending" } } } },
        },
      },
    },
  })
  if (!campaign) redirect("/onboarding")

  if (!campaign.site) {
    return (
      <CreateSitePanel
        candidateName={campaign.candidateName}
        office={campaign.office}
        thinProfile={!campaign.bio && !campaign.whyRunning}
      />
    )
  }

  const s = campaign.site
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

  return (
    <WebsiteBuilder
      campaignId={campaign.id}
      hasHeadshot={!!s.headshotMime}
      site={site}
      pendingSignups={s._count.signups}
    />
  )
}
