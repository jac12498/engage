import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { requireActiveCampaign } from "@/lib/context"
import { listCommitteeTemplates } from "@/lib/website/templates"
import { TemplatesManager } from "@/components/website/TemplatesManager"

export const dynamic = "force-dynamic"
export const metadata = { title: "Website templates · Engage" }

export default async function WebsiteTemplatesPage() {
  const { committee } = await requireActiveCampaign()

  const [templates, site] = await Promise.all([
    listCommitteeTemplates(committee.id),
    prisma.website.findUnique({ where: { committeeId: committee.id }, select: { id: true } }),
  ])

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
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Website templates</h1>
        <p className="mt-1 text-muted-foreground">
          Import an existing website to reuse its structure, or start a site from a template you&rsquo;ve saved.
        </p>
      </div>

      <div className="mt-6">
        <TemplatesManager templates={templates} hasSite={Boolean(site)} />
      </div>
    </div>
  )
}
