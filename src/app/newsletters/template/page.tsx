import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { parseTemplate } from "@/lib/newsletter/template"
import { NewsletterTemplateEditor } from "@/components/website/NewsletterTemplateEditor"
import { SavedPresets } from "@/components/website/SavedPresets"

export const dynamic = "force-dynamic"
export const metadata = { title: "Newsletter template · Engage" }

export default async function NewsletterTemplatePage() {
  const { candidate, campaign: activeCampaign } = await requireActiveCampaign()

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

  const presets = await prisma.newsletterPreset.findMany({
    where: { campaignId: campaign.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true },
  })

  return (
    <>
    <NewsletterTemplateEditor
      campaignId={candidate.id}
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
      template={parseTemplate(campaign.newsletterTemplate)}
    />
    <SavedPresets presets={presets} />
    </>
  )
}
