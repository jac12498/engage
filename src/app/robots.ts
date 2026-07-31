import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://engageamplify.com"

// Index the public marketing pages; keep the authenticated app + API and the
// per-campaign public site previews out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/communications",
        "/website",
        "/newsletters",
        "/contacts",
        "/settings",
        "/onboarding",
        "/sign-in",
        "/verify-request",
        "/api/",
        "/newsletter/",
        "/websites/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
