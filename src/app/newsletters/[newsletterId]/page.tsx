import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DEFAULT_AI_MODEL } from "@/lib/entitlements"
import { parseBlocks } from "@/lib/newsletter/blocks"
import { parseTemplate } from "@/lib/newsletter/template"
import { NewsletterEditor } from "@/components/website/NewsletterEditor"

export const dynamic = "force-dynamic"

export const metadata = { title: "Edit newsletter · Engage" }

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
    select: {
      id: true,
      aiModel: true,
      candidateName: true,
      committeeName: true,
      mailingStreet: true,
      mailingStreet2: true,
      mailingCity: true,
      mailingState: true,
      mailingZip: true,
      headshotMime: true,
      newsletterTemplate: true,
      site: { select: { published: true } },
    },
  })
  if (!campaign) redirect("/onboarding")

  const n = await prisma.newsletter.findFirst({ where: { id: newsletterId, campaignId: campaign.id } })
  if (!n) notFound()

  const activeSubscribers = await prisma.newsletterSubscriber.count({
    where: { campaignId: campaign.id, status: "active" },
  })

  const hasMailingAddress = Boolean(
    campaign.mailingStreet?.trim() &&
      campaign.mailingCity?.trim() &&
      campaign.mailingState?.trim() &&
      campaign.mailingZip?.trim()
  )

  // Legacy issues (plain-text body, no blocks) open as a single text block.
  const existing = parseBlocks(n.blocks)
  const blocks =
    existing.length > 0
      ? existing
      : n.body.trim()
        ? [{ id: "legacy", type: "text" as const, props: { body: n.body } }]
        : []

  return (
    <NewsletterEditor
      campaignId={campaign.id}
      sitePublished={campaign.site?.published ?? false}
      defaultModel={campaign.aiModel ?? DEFAULT_AI_MODEL}
      activeSubscribers={activeSubscribers}
      hasMailingAddress={hasMailingAddress}
      campaign={{
        candidateName: campaign.candidateName,
        committeeName: campaign.committeeName,
        headshotMime: campaign.headshotMime,
        mailing: {
          street: campaign.mailingStreet,
          street2: campaign.mailingStreet2,
          city: campaign.mailingCity,
          state: campaign.mailingState,
          zip: campaign.mailingZip,
        },
      }}
      template={parseTemplate(n.template ?? campaign.newsletterTemplate)}
      newsletter={{
        id: n.id,
        subject: n.subject,
        preview: n.preview ?? "",
        blocks,
        status: n.status,
        publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
        sentAt: n.sentAt ? n.sentAt.toISOString() : null,
        recipientCount: n.recipientCount ?? null,
      }}
    />
  )
}
