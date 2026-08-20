import { prisma } from "@/lib/prisma"

export const FONT_STACK: Record<string, string> = {
  classic: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  modern: '"Trebuchet MS", "Segoe UI", Tahoma, system-ui, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
}

/**
 * Load a site for public rendering: theme + site links + all pages (each with its
 * ordered blocks) + the campaign identity used in the header/footer. Never pulls the
 * headshot bytes (served separately via /api/website/headshot/[campaignId]).
 */
export async function loadPublicSite(committeeId: string) {
  // The route param is now the COMMITTEE id (the website is committee-owned in 2b-2).
  const site = await prisma.website.findUnique({
    where: { committeeId },
    omit: { headshotData: true },
    include: {
      pages: {
        orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
        include: { blocks: { orderBy: { order: "asc" } } },
      },
      committee: {
        select: {
          name: true,
          candidates: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              candidateName: true,
              headshotMime: true,
              campaigns: { orderBy: [{ cycle: "desc" }], take: 1, select: { office: true, party: true } },
            },
          },
        },
      },
    },
  })
  if (!site) return null

  const { committee, ...rest } = site
  return {
    ...rest,
    // Committee-level identity (default to the committee name).
    siteTitle: site.siteTitle ?? committee.name,
    paidForBy: site.paidForBy ?? committee.name,
    committeeName: committee.name,
    candidates: committee.candidates.map((c) => ({
      id: c.id,
      name: c.candidateName,
      office: c.campaigns[0]?.office ?? "",
      party: c.campaigns[0]?.party ?? null,
      hasHeadshot: !!c.headshotMime,
    })),
  }
}

export type PublicSite = NonNullable<Awaited<ReturnType<typeof loadPublicSite>>>
export type PublicPage = PublicSite["pages"][number]

/** Split plain text into paragraphs on blank lines (no HTML/markdown → no XSS). */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return []
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
