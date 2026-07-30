import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { loadPublicSite } from "../_render/site"
import { ArchiveShell } from "../_render/ArchiveShell"
import { ArchiveSubscribe } from "../_render/ArchiveSubscribe"

export const dynamic = "force-dynamic"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string }>
}): Promise<Metadata> {
  const { campaignId } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) return { title: "Not found" }
  return { title: `Newsletter · ${site.campaign.candidateName}` }
}

export default async function NewsletterArchivePage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const site = await loadPublicSite(campaignId)
  if (!site || !site.published) notFound()

  const items = await prisma.newsletter.findMany({
    where: { campaignId, status: "published" },
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    select: { id: true, subject: true, preview: true, publishedAt: true },
  })

  return (
    <ArchiveShell site={site}>
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: "var(--site-primary)" }}>
          Newsletter
        </h1>
        <p className="mt-2 text-lg text-[#555]">Updates from the campaign.</p>

        {items.length === 0 ? (
          <p className="mt-10 text-[#555]">No newsletters have been published yet. Check back soon.</p>
        ) : (
          <div className="mt-8 space-y-4">
            {items.map((n) => (
              <Link
                key={n.id}
                href={`/websites/${campaignId}/newsletter/${n.id}`}
                className="block rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                {n.publishedAt && (
                  <p className="text-xs uppercase tracking-wider text-[#888]">
                    {n.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                )}
                <h2 className="mt-1 text-xl font-semibold" style={{ color: "var(--site-primary)" }}>
                  {n.subject || "Newsletter"}
                </h2>
                {n.preview && <p className="mt-2 line-clamp-2 leading-relaxed text-[#555]">{n.preview}</p>}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-12">
          <Link
            href={`/websites/${campaignId}`}
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--site-primary)" }}
          >
            ← Back to {site.campaign.candidateName}
          </Link>
        </div>
      </main>
      <ArchiveSubscribe campaignId={campaignId} accent={site.accentColor} />
    </ArchiveShell>
  )
}
