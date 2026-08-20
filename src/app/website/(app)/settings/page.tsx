import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { SiteSettingsForm } from "@/components/website/SiteSettingsForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Website settings · Engage" }

export default async function WebsiteSettingsPage() {
  const { committee } = await requireActiveCampaign()

  const s = await prisma.website.findUnique({
    where: { committeeId: committee.id },
    select: {
      siteTitle: true,
      paidForBy: true,
      primaryColor: true,
      accentColor: true,
      fontTheme: true,
      donateUrl: true,
      contactEmail: true,
    },
  })
  // No site yet → nothing to configure; send them to the builder to create one.
  if (!s) redirect("/website")

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
          Your committee site&rsquo;s title, &ldquo;Paid for by&rdquo; line, theme, and calls to action.
        </p>
      </div>

      <div className="mt-6">
        <SiteSettingsForm
          initial={{
            siteTitle: s.siteTitle ?? committee.name,
            paidForBy: s.paidForBy ?? committee.name,
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
