import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { resolveModel } from "@/lib/entitlements"
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
  const { candidate, campaign: activeCampaign, committee } = await requireActiveCampaign()

  const campaign = await prisma.campaign.findUnique({
    where: { id: activeCampaign.id },
    select: {
      id: true,
      committeeName: true,
      mailingStreet: true,
      mailingStreet2: true,
      mailingCity: true,
      mailingState: true,
      mailingZip: true,
      newsletterTemplate: true,
    },
  })
  if (!campaign) redirect("/onboarding")

  // Topics are committee-level grounding (Phase 1).
  const topics = await prisma.topic.findMany({
    where: { committeeId: committee.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  })

  // Website + subscribers are per-candidate in 2a (public routes key on the candidate id).
  const site = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: { published: true },
  })

  const n = await prisma.newsletter.findFirst({ where: { id: newsletterId, campaignId: campaign.id } })
  if (!n) notFound()

  const activeSubscribers = await prisma.newsletterSubscriber.count({
    where: { committeeId: committee.id, status: "active" },
  })

  // Saved Communications "Newsletter Article" pieces, for the "Insert from
  // Communications" picker in the editor.
  const commsArticles = await prisma.generation.findMany({
    where: { campaignId: campaign.id, type: "newsletter_article" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, title: true, content: true },
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
      campaignId={candidate.id}
      sitePublished={site?.published ?? false}
      defaultModel={resolveModel(committee.aiModel)}
      activeSubscribers={activeSubscribers}
      hasMailingAddress={hasMailingAddress}
      topics={topics}
      commsArticles={commsArticles}
      campaign={{
        candidateName: candidate.candidateName,
        committeeName: campaign.committeeName,
        headshotMime: candidate.headshotMime,
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
