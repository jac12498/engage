import Link from "next/link"

// Public marketing chrome — no auth. Phase B ports the full marketing site
// (home + platform pillar pages) into this route group. Route groups add no URL
// segment, so this layout wraps `/`, `/platform/*`, `/pricing`, etc.
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
              E
            </span>
            <span className="text-lg font-bold tracking-tight text-[#1a1a2e]">Engage</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-[#1a1a2e]"
            >
              Sign in
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-4 py-2 text-sm font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-[#f4f6f9]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Engage</span>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="hover:text-[#1a1a2e]">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
