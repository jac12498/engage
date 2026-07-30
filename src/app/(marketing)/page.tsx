import Link from "next/link"
import { ArrowRight } from "lucide-react"

export const metadata = {
  title: "Engage — The Complete Platform for Local Campaigns",
  description:
    "AI communications, a candidate website, a newsletter, voter outreach, fundraising, and field tools — everything a campaign needs, in one platform.",
}

// Phase A placeholder landing. Phase B ports the full EngageAmplify marketing home
// and platform pillar pages into this (marketing) route group.
export default function MarketingHome() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-[#1a1a2e] sm:text-5xl">
        Everything your campaign needs, in one platform.
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
        AI communications, a candidate website, a newsletter, voter outreach, fundraising, and field
        tools — built for local campaigns.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-border px-6 py-3 text-base font-medium text-[#1a1a2e] transition-colors hover:bg-[#f4f6f9]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  )
}
