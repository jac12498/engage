import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DEFAULT_AI_MODEL } from "@/lib/entitlements"
import { NewsletterEditor } from "@/components/website/NewsletterEditor"

export const dynamic = "force-dynamic"

export const metadata = { title: "Edit newsletter · Engage Campaign" }

export default async function NewsletterEditorPage({
  params,
}: {
  params: Promise<{ newsletterId: string }>
}) {
  const { newsletterId } = await params
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const campaign = await prisma.campaign.findUnique({
    where: { userId: session.user.id },
    select: { id: true, aiModel: true, site: { select: { published: true } } },
  })
  if (!campaign) redirect("/onboarding")

  const n = await prisma.newsletter.findFirst({ where: { id: newsletterId, campaignId: campaign.id } })
  if (!n) notFound()

  return (
    <NewsletterEditor
      campaignId={campaign.id}
      sitePublished={campaign.site?.published ?? false}
      defaultModel={campaign.aiModel ?? DEFAULT_AI_MODEL}
      newsletter={{
        id: n.id,
        subject: n.subject,
        preview: n.preview ?? "",
        body: n.body,
        status: n.status,
        publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
      }}
    />
  )
}
