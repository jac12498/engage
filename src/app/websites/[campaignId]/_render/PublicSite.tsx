import Link from "next/link"
import type { CSSProperties } from "react"
import { BlockRenderer, type RenderCtx } from "./blocks"
import { FONT_STACK, type PublicSite as Site, type PublicPage } from "./site"

/** Render a full public page: themed chrome (nav + footer) around the page's blocks. */
export function PublicSite({ site, activePage }: { site: Site; activePage: PublicPage }) {
  const font = FONT_STACK[site.fontTheme] ?? FONT_STACK.classic

  const ctx: RenderCtx = {
    committeeId: site.committeeId,
    accentColor: site.accentColor,
    siteTitle: site.siteTitle,
    candidates: site.candidates,
  }

  // Nav = published, showInNav pages in navOrder. Home links to the root.
  const navPages = site.pages.filter((p) => p.published && p.showInNav)
  const homeHref = `/websites/${site.committeeId}`
  const pageHref = (p: PublicPage) => (p.isHome ? homeHref : `${homeHref}/${p.slug}`)

  const themeVars = {
    "--site-primary": site.primaryColor,
    "--site-accent": site.accentColor,
    fontFamily: font,
  } as CSSProperties

  return (
    <div style={{ ...themeVars, color: "#1a1a2e" }} className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href={homeHref} className="text-lg font-bold" style={{ color: "var(--site-primary)" }}>
            {site.siteTitle}
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium">
            {navPages.map((p) => (
              <Link
                key={p.id}
                href={pageHref(p)}
                className={`hidden hover:opacity-70 sm:inline ${
                  p.id === activePage.id ? "opacity-100" : "opacity-80"
                }`}
              >
                {p.title}
              </Link>
            ))}
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
          </nav>
        </div>
      </header>

      {/* Page blocks */}
      <main>
        {activePage.blocks.map((b) => (
          <BlockRenderer key={b.id} type={b.type} props={b.props} ctx={ctx} />
        ))}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: "var(--site-primary)" }} className="text-white/80">
        <div className="mx-auto max-w-5xl px-6 py-10 text-sm">
          <p className="font-semibold text-white">{site.siteTitle}</p>
          {site.contactEmail && (
            <p className="mt-1">
              <a href={`mailto:${site.contactEmail}`} className="hover:underline">
                {site.contactEmail}
              </a>
            </p>
          )}
          <p className="mt-4 text-xs text-white/50">Paid for by {site.paidForBy}.</p>
        </div>
      </footer>
    </div>
  )
}
