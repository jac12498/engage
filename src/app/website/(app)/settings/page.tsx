import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { SiteSettingsForm } from "@/components/website/SiteSettingsForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Website settings · Engage" }

export default async function WebsiteSettingsPage() {
  const { campaign: active } = await requireActiveCampaign()

  const campaign = await prisma.campaign.findUnique({
    where: { id: active.id },
    select: {
      site: {
        select: {
          primaryColor: true,
          accentColor: true,
          fontTheme: true,
          donateUrl: true,
          contactEmail: true,
        },
      },
    },
  })
  if (!campaign) redirect("/onboarding")
  // No site yet → nothing to configure; send them to the builder to create one.
  if (!campaign.site) redirect("/website")

  const s = campaign.site

  return (
    <div>
      <Link
        href="/website"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#1a1a2e]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to website
      </Link>

      <div className="mt-3">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Website settings</h1>
        <p className="mt-1 text-muted-foreground">
          Your site&rsquo;s theme colors, font, and calls to action. Your headshot is managed in{" "}
          <Link href="/settings" className="font-medium text-[#1b3a6b] hover:underline">
            Campaign settings
          </Link>
          .
        </p>
      </div>

      <div className="mt-6">
        <SiteSettingsForm
          initial={{
            primaryColor: s.primaryColor,
            accentColor: s.accentColor,
            fontTheme: s.fontTheme,
            donateUrl: s.donateUrl ?? "",
            contactEmail: s.contactEmail ?? "",
          }}
        />
      </div>
    </div>
  )
}
