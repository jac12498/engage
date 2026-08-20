import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import type { CSSProperties } from "react"
import { prisma } from "@/lib/prisma"
import { WEBSITE_NEWS_TYPES } from "@/lib/website/blocks"
import { loadPublicSite, FONT_STACK, paragraphs } from "../../_render/site"

export const dynamic = "force-dynamic"

/**
 * A committee candidate's profile — route-rendered from the candidate's own data
 * (bio, latest run, standing positions, published news) rather than a stored
 * Page/Block site. Always fresh, no per-candidate generation. 404 if the candidate
 * isn't in this committee.
 */
async function loadCandidate(committeeId: string, candidateId: string) {
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, committeeId },
    select: {
      id: true,
      candidateName: true,
      bio: true,
      whyRunning: true,
      headshotMime: true,
      campaigns: {
        orderBy: { cycle: "desc" },
        take: 1,
        select: {
          id: true,
          office: true,
          party: true,
          contextItems: {
            where: { type: "position" },
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, body: true, keyPoints: true },
          },
        },
      },
    },
  })
  if (!candidate) return null

  const campaign = candidate.campaigns[0] ?? null
  const news = campaign
    ? await prisma.generation.findMany({
        where: {
          campaignId: campaign.id,
          published: true,
          type: { in: WEBSITE_NEWS_TYPES as unknown as string[] },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, title: true, content: true, createdAt: true },
      })
    : []

  return { candidate, campaign, news }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ campaignId: string; candidateId: string }>
}): Promise<Metadata> {
  const { campaignId, candidateId } = await params
  const [site, data] = await Promise.all([
    loadPublicSite(campaignId),
    loadCandidate(campaignId, candidateId),
  ])
  if (!site || !site.published || !data) return { title: "Not found" }
  return {
    title: `${data.candidate.candidateName} · ${site.siteTitle}`,
    description: data.campaign?.office ? `${data.candidate.candidateName} for ${data.campaign.office}.` : undefined,
  }
}

export default async function CandidateProfilePage({
  params,
}: {
  params: Promise<{ campaignId: string; candidateId: string }>
}) {
  const { campaignId, candidateId } = await params
  const [site, data] = await Promise.all([
    loadPublicSite(campaignId),
    loadCandidate(campaignId, candidateId),
  ])
  if (!site || !site.published || !data) notFound()

  const { candidate, campaign, news } = data
  const font = FONT_STACK[site.fontTheme] ?? FONT_STACK.classic
  const themeVars = {
    "--site-primary": site.primaryColor,
    "--site-accent": site.accentColor,
    fontFamily: font,
  } as CSSProperties
  const homeHref = `/websites/${site.committeeId}`
  const positions = campaign?.contextItems ?? []

  return (
    <div style={{ ...themeVars, color: "#1a1a2e" }} className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="text-lg font-bold" style={{ color: "var(--site-primary)" }}>
            {site.siteTitle}
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

      {/* Hero */}
      <section style={{ backgroundColor: "var(--site-primary)" }} className="text-white">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-8 px-6 py-16 sm:flex-row sm:items-center">
          {candidate.headshotMime && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/website/headshot/${candidate.id}`}
              alt={candidate.candidateName}
              className="h-40 w-40 shrink-0 rounded-2xl object-cover ring-4 ring-white/20"
            />
          )}
          <div>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{candidate.candidateName}</h1>
            {campaign?.office && (
              <p className="mt-3 text-lg text-white/85">
                Candidate for {campaign.office}
                {campaign.party ? ` · ${campaign.party}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* About */}
      {(candidate.bio || candidate.whyRunning) && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
            About {candidate.candidateName}
          </h2>
          <div className="mt-5 space-y-4 text-lg leading-relaxed text-[#333]">
            {paragraphs(candidate.bio).map((p, i) => (
              <p key={`bio-${i}`}>{p}</p>
            ))}
            {paragraphs(candidate.whyRunning).map((p, i) => (
              <p key={`why-${i}`}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Issues / positions */}
      {positions.length > 0 && (
        <section id="issues" style={{ backgroundColor: "#f7f8fa" }}>
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
              Where {candidate.candidateName.split(" ")[0]} stands
            </h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {positions.map((pos) => (
                <div key={pos.id} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                  <h3 className="text-xl font-semibold" style={{ color: "var(--site-accent)" }}>
                    {pos.title || "Priority"}
                  </h3>
                  <div className="mt-2 space-y-3 leading-relaxed text-[#444]">
                    {paragraphs(pos.body).map((p, j) => (
                      <p key={j}>{p}</p>
                    ))}
                  </div>
                  {pos.keyPoints.length > 0 && (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[#444]">
                      {pos.keyPoints.map((kp, j) => (
                        <li key={j}>{kp}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* News */}
      {news.length > 0 && (
        <section id="news" className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-3xl font-bold" style={{ color: "var(--site-primary)" }}>
            Latest from {candidate.candidateName.split(" ")[0]}
          </h2>
          <div className="mt-8 space-y-4">
            {news.map((g) => {
              const [first] = paragraphs(g.content)
              return (
                <Link
                  key={g.id}
                  href={`${homeHref}/news/${g.id}`}
                  className="block rounded-2xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <p className="text-xs uppercase tracking-wider text-[#888]">
                    {g.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold" style={{ color: "var(--site-primary)" }}>
                    {g.title || "Update"}
                  </h3>
                  {first && <p className="mt-2 line-clamp-2 leading-relaxed text-[#555]">{first}</p>}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* Back link */}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <Link href={homeHref} className="text-sm font-medium hover:underline" style={{ color: "var(--site-primary)" }}>
          ← Back to {site.siteTitle}
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: "var(--site-primary)" }} className="text-white/80">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm">
          <p className="font-semibold text-white">{site.siteTitle}</p>
          <p className="mt-4 text-xs text-white/50">Paid for by {site.paidForBy}.</p>
        </div>
      </footer>
    </div>
  )
}
