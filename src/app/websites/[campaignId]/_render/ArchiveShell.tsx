import Link from "next/link"
import type { CSSProperties } from "react"
import { formatBallotLine } from "@/lib/party"
import { FONT_STACK, type PublicSite } from "./site"

// Themed header/footer chrome for the public newsletter archive pages (list + detail),
// matching the site's theme. Keeps the two routes DRY.
export function ArchiveShell({ site, children }: { site: PublicSite; children: React.ReactNode }) {
  const { campaign } = site
  const font = FONT_STACK[site.fontTheme] ?? FONT_STACK.classic
  const themeVars = {
    "--site-primary": site.primaryColor,
    "--site-accent": site.accentColor,
    fontFamily: font,
  } as CSSProperties

  return (
    <div style={{ ...themeVars, color: "#1a1a2e" }} className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href={`/websites/${site.campaignId}`}
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

      {children}

      <footer style={{ backgroundColor: "var(--site-primary)" }} className="text-white/80">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm">
          <p className="font-semibold text-white">
            {campaign.candidateName} for {campaign.office}
          </p>
          <p className="mt-4 text-xs text-white/50">
            Paid for by {campaign.committeeName || `${campaign.candidateName} for ${campaign.office}`}
            {formatBallotLine(campaign.party, campaign.additionalParties)
              ? ` · ${formatBallotLine(campaign.party, campaign.additionalParties)}`
              : ""}
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
