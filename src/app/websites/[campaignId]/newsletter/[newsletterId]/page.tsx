import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { loadPublicSite, paragraphs } from "../../_render/site"
import { ArchiveShell } from "../../_render/ArchiveShell"
import { ArchiveSubscribe } from "../../_render/ArchiveSubscribe"

export const dynamic = "force-dynamic"

/** A published newsletter for this campaign — or null. */
async function loadIssue(campaignId: string, newsletterId: string) {
  return prisma.newsletter.findFirst({
    where: { id: newsletterId, campaignId, status: "published" },
    select: { id: true, subject: true, preview: true, body: true, publishedAt: true },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; newsletterId: string }>
}): Promise<Metadata> {
  const { campaignId, newsletterId } = await params
  const issue = await loadIssue(campaignId, newsletterId)
  if (!issue) return { title: "Not found" }
  return {
    title: issue.subject || "Newsletter",
    description: issue.preview || undefined,
  }
}

export default async function NewsletterIssuePage({
  params,
}: {
  params: Promise<{ campaignId: string; newsletterId: string }>
}) {
  const { campaignId, newsletterId } = await params
  const [site, issue] = await Promise.all([loadPublicSite(campaignId), loadIssue(campaignId, newsletterId)])
  if (!site || !site.published || !issue) notFound()

  return (
    <ArchiveShell site={site}>
      <article className="mx-auto max-w-3xl px-6 py-16">
        {issue.publishedAt && (
          <p className="text-xs uppercase tracking-wider" style={{ color: "var(--site-accent)" }}>
            {issue.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: "var(--site-primary)" }}>
          {issue.subject || "Newsletter"}
        </h1>
        <div className="mt-8 space-y-4 text-lg leading-relaxed text-[#333]">
          {paragraphs(issue.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-6">
          <Link
            href={`/websites/${campaignId}/newsletter`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--site-primary)" }}
          >
            ← All newsletters
          </Link>
          <Link
            href={`/websites/${campaignId}`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--site-primary)" }}
          >
            Back to {site.campaign.candidateName}
          </Link>
        </div>
      </article>
      <ArchiveSubscribe campaignId={campaignId} accent={site.accentColor} />
    </ArchiveShell>
  )
}
