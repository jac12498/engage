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
export async function loadPublicSite(campaignId: string) {
  return prisma.website.findUnique({
    where: { campaignId },
    omit: { headshotData: true },
    include: {
      pages: {
        orderBy: [{ navOrder: "asc" }, { createdAt: "asc" }],
        include: { blocks: { orderBy: { order: "asc" } } },
      },
      campaign: {
        select: {
          candidateName: true,
          office: true,
          party: true,
          committeeName: true,
          state: true,
        },
      },
    },
  })
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
