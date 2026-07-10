import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { CSSProperties } from "react"
import { prisma } from "@/lib/prisma"
import { CONTENT_TYPE_LABELS, type ContentType } from "@/lib/comms/prompts"
import { WEBSITE_NEWS_TYPES } from "@/lib/website/blocks"
import { loadPublicSite, FONT_STACK, paragraphs } from "../../_render/site"

export const dynamic = "force-dynamic"

/** The published, website-appropriate generation for this campaign — or null. */
async function loadArticle(campaignId: string, generationId: string) {
  return prisma.generation.findFirst({
    where: {
      id: generationId,
      campaignId,
      published: true,
      type: { in: WEBSITE_NEWS_TYPES as unknown as string[] },
    },
    select: { id: true, title: true, type: true, content: true, createdAt: true },
  })
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; generationId: string }>
}): Promise<Metadata> {
  const { campaignId, generationId } = await params
  const article = await loadArticle(campaignId, generationId)
  if (!article) return { title: "Not found" }
  return { title: article.title || "Update" }
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string; generationId: string }>
}) {
  const { campaignId, generationId } = await params
  const [site, article] = await Promise.all([
    loadPublicSite(campaignId),
    loadArticle(campaignId, generationId),
  ])
  if (!site || !site.published || !article) notFound()

  const { campaign } = site
  const font = FONT_STACK[site.fontTheme] ?? FONT_STACK.classic
  const themeVars = {
    "--site-primary": site.primaryColor,
    "--site-accent": site.accentColor,
    fontFamily: font,
  } as CSSProperties
  const typeLabel = CONTENT_TYPE_LABELS[article.type as ContentType] ?? "Update"

  return (
    <div style={{ ...themeVars, color: "#1a1a2e" }} className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href={`/websites/${campaignId}`}
            className="text-lg font-bold"
            style={{ color: "var(--site-primary)" }}
          >
            {campaign.candidateName}
          </Link>
          {site.donateUrl && (
            <a
              href={site.donateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--site-accent)" }}
            >
              Donate
            </a>
          )}
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-wider" style={{ color: "var(--site-accent)" }}>
          {typeLabel}
          {" · "}
          {article.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: "var(--site-primary)" }}>
          {article.title || "Update"}
        </h1>
        <div className="mt-8 space-y-4 text-lg leading-relaxed text-[#333]">
          {paragraphs(article.content).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-12">
          <Link href={`/websites/${campaignId}`} className="text-sm font-medium hover:underline" style={{ color: "var(--site-primary)" }}>
            ← Back to {campaign.candidateName}
          </Link>
        </div>
      </article>

      <footer style={{ backgroundColor: "var(--site-primary)" }} className="text-white/80">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm">
          <p className="font-semibold text-white">
            {campaign.candidateName} for {campaign.office}
          </p>
          <p className="mt-4 text-xs text-white/50">
            Paid for by {campaign.committeeName || `${campaign.candidateName} for ${campaign.office}`}
            {campaign.party ? ` · ${campaign.party}` : ""}.
          </p>
        </div>
      </footer>
    </div>
  )
}
