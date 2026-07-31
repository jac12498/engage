import Link from "next/link"

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { label: "Communications", href: "/platform/ai-communications" },
      { label: "Candidate Websites", href: "/platform/candidate-websites" },
      { label: "Newsletter", href: "/platform/newsletter" },
      { label: "Voter Outreach", href: "/platform/voter-outreach" },
      { label: "Fundraising", href: "/platform/fundraising" },
      { label: "Field Tools", href: "/platform/field-tools" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/#pricing" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Log in", href: "/sign-in" },
      { label: "Create account", href: "/sign-in" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-[#0f2044] text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-sm font-black text-[#0f2044]">
                E
              </span>
              <span className="text-lg font-bold tracking-tight">Engage</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-white/60">
              The complete platform for down-ballot campaigns. Built to help local candidates
              communicate, organize, and win.
            </p>
            <p className="mt-3 text-xs text-white/40">
              Voter data currently available in New York · expanding state by state.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-white">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row">
          <p>© {new Date().getFullYear()} Engage. All rights reserved.</p>
          <p>
            A{" "}
            <span className="font-medium text-white/70">Cardinal Technology</span> product.
          </p>
        </div>
      </div>
    </footer>
  )
}
