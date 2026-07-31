import type { MetadataRoute } from "next"

// Public marketing URLs for search engines. The app/dashboard routes are
// auth-gated and intentionally excluded (see robots.ts).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://engageamplify.com"

const MARKETING_PATHS = [
  "",
  "/platform/ai-communications",
  "/platform/candidate-websites",
  "/platform/newsletter",
  "/platform/voter-outreach",
  "/platform/fundraising",
  "/platform/field-tools",
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return MARKETING_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.8,
  }))
}
