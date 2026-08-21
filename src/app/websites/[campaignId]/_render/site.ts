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
          logoMime: true,
          actblueUrl: true,
          websiteUrl: true,
          mailingStreet: true,
          mailingStreet2: true,
          mailingCity: true,
          mailingState: true,
          mailingZip: true,
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
    // Committee assets surfaced in the site chrome.
    logoUrl: committee.logoMime ? `/api/committee/logo/${committeeId}` : null,
    // The site's own donate link wins; else fall back to the committee's ActBlue asset.
    donateUrl: site.donateUrl || committee.actblueUrl || null,
    committeeWebsite: committee.websiteUrl ?? null,
    mailingAddress: formatAddress(committee),
    candidates: committee.candidates.map((c) => ({
      id: c.id,
      name: c.candidateName,
      office: c.campaigns[0]?.office ?? "",
      party: c.campaigns[0]?.party ?? null,
      hasHeadshot: !!c.headshotMime,
    })),
  }
}

/** One-line postal address from the committee's mailing fields, or null if unset. */
function formatAddress(c: {
  mailingStreet: string | null
  mailingStreet2: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
}): string | null {
  const cityLine = [c.mailingCity, [c.mailingState, c.mailingZip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ")
  const parts = [c.mailingStreet, c.mailingStreet2, cityLine].map((p) => p?.trim()).filter(Boolean)
  return parts.length ? parts.join(", ") : null
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
