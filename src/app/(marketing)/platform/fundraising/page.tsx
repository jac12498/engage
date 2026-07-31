import Link from "next/link"
import type { Metadata } from "next"
import {
  HandCoins,
  Search,
  Bookmark,
  SlidersHorizontal,
  Building2,
  Users,
  Landmark,
  Link2,
  MapPin,
  Check,
  ArrowRight,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"

const APP_URL = "/sign-in"

export const metadata: Metadata = {
  title: "Fundraising — Engage",
  description:
    "Find proven donors with state and federal records, research who funds similar campaigns and committees, and link donors straight to your CRM.",
}

export default function FundraisingPage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <Hero />
      <Problem />
      <Capabilities />
      <Preview />
      <Value />
      <Differentiators />
      <CTA />
      <SiteFooter />
    </div>
  )
}

/* ─────────────────────────── Hero ─────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f2044] via-[#122850] to-[#1b3a6b] text-white">
      <div className="absolute inset-0 bg-grid opacity-60" />
      <div className="glow-gold pointer-events-none absolute -top-32 right-0 h-[480px] w-[480px]" />

      <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <Link
          href="/#platform"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Back to platform
        </Link>

        <div className="mt-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#f0b429]">
            <HandCoins className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Fundraising
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          Find the donors who are already giving.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          Stop guessing who might give. Search real state and federal contribution records, see who
          funds campaigns like yours, and turn proven donors into your donors — with every record
          one click from your contacts.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#preview"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            See it in action
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── The problem ─────────────────────── */

function Problem() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
              The hardest list to build
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              Money is the call time nobody wants to make blind
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Down-ballot campaigns burn their first weeks asking friends and family, then run dry.
              Meanwhile the people most likely to give — those who already donate to candidates like
              you — are sitting in public records you can&apos;t easily search.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              The information is public. Finding it, filtering it, and turning it into a call list
              has always meant paid consultants or hours digging through state and FEC filings.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">Fundraising blind</p>
            <ul className="mt-5 space-y-4">
              {[
                "A call list that ends with your cousins",
                "No idea who funds candidates like you",
                "Public filings locked in clunky state portals",
                "Donor research priced for congressional budgets",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm font-semibold text-[#1a1a2e]">With Engage</p>
              <ul className="mt-5 space-y-4">
                {[
                  "A prospect list of people who already give",
                  "See exactly who funds similar campaigns",
                  "State and federal records in one search",
                  "Donor research without the consultant invoice",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#1a1a2e]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1e6b3a]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Capabilities ─────────────────────── */

const CAPABILITIES = [
  {
    icon: Search,
    title: "Donor lookup",
    description: "Search state and federal contribution records by name and see a donor's full giving history.",
  },
  {
    icon: SlidersHorizontal,
    title: "Advanced donor search",
    description: "Filter by location, election year, amount, contributor type, disclosure period, and more.",
  },
  {
    icon: Bookmark,
    title: "Saved searches",
    description: "Build, name, and reuse prospect searches — and replicate one to spin up the next quickly.",
  },
  {
    icon: Building2,
    title: "Committee research",
    description: "Look up any committee's registration, treasurer, and the full list of who donated to it.",
  },
  {
    icon: Users,
    title: "Candidate & opponent lookup",
    description: "Find the committees behind candidates like you — or your opponent — and see their backers.",
  },
  {
    icon: Landmark,
    title: "State + federal data",
    description: "Search across available state filings and federal FEC records from one place.",
  },
  {
    icon: Link2,
    title: "Link donors to contacts",
    description: "Connect a donor record to a contact in your CRM so giving history lives with the person.",
  },
  {
    icon: MapPin,
    title: "Donor maps",
    description: "See where a candidate's or committee's donors are concentrated on an interactive map.",
  },
]

function Capabilities() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            A finance shop in a search bar
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Everything you need to find and qualify donors
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The same public-records research that funds the big campaigns — in a tool any local
            candidate can use in an afternoon.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1a1a2e]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Donor search preview ─────────────────────── */

const FILTERS = [
  { label: "Location", value: "New York + Federal" },
  { label: "Gave to", value: "Committees like yours" },
  { label: "Amount", value: "$250 +" },
  { label: "Cycle", value: "2022 – 2026" },
]

const RESULTS = [
  { name: "Eleanor V.", city: "Kingston, NY", total: "$4,300" },
  { name: "Marcus T.", city: "New Paltz, NY", total: "$2,750" },
  { name: "Priya N.", city: "Woodstock, NY", total: "$1,900" },
  { name: "David & Ruth K.", city: "Saugerties, NY", total: "$1,500" },
  { name: "Angela M.", city: "Rosendale, NY", total: "$1,200" },
]

function Preview() {
  return (
    <section id="preview" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            From public records to call list
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Build a prospect list of proven givers
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          {/* Filters */}
          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
              <SlidersHorizontal className="h-4 w-4 text-[#c4910a]" />
              Your search
            </div>
            <div className="mt-6 space-y-3">
              {FILTERS.map((filter) => (
                <div
                  key={filter.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {filter.label}
                  </span>
                  <span className="text-sm font-semibold text-[#1a1a2e]">{filter.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-lg border border-dashed border-[#c4910a]/40 bg-white p-3 text-xs text-muted-foreground">
              Save this search and replicate it to build your next list in seconds.
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#1b3a6b]/15 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-[#0f2044] px-5 py-3 text-white">
              <span className="text-sm font-semibold">1,240 donors match</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
                State + Federal
              </span>
            </div>
            <div className="divide-y divide-border">
              {RESULTS.map((row) => (
                <div key={row.name} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a2e]">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.city}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-[#1b3a6b]">{row.total}</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#1b3a6b]/30 px-2.5 py-1 text-xs font-medium text-[#1b3a6b]">
                      <Link2 className="h-3 w-3" />
                      Link
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-[#f4f6f9] px-5 py-3 text-center text-xs text-muted-foreground">
              + 1,235 more — sorted by total giving
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Link a donor to a contact and their giving history lives in your CRM — ready for{" "}
          <Link href="/platform/voter-outreach" className="font-medium text-[#1b3a6b] underline">
            outreach
          </Link>{" "}
          and an ask drafted by{" "}
          <Link href="/platform/ai-communications" className="font-medium text-[#1b3a6b] underline">
            Communications
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────── Value ─────────────────────────── */

const VALUE = [
  {
    icon: HandCoins,
    stat: "Proven givers",
    title: "Ask people who already say yes",
    description:
      "Target donors with a track record of giving to campaigns like yours, instead of cold-calling a list of maybes.",
  },
  {
    icon: Landmark,
    stat: "State + federal",
    title: "All the records, one search",
    description:
      "Pull from available state filings and federal FEC data together — no portal-hopping, no consultant in the middle.",
  },
  {
    icon: Link2,
    stat: "Record → relationship",
    title: "Research that becomes action",
    description:
      "Linked donors flow into your CRM, so a name in a filing becomes a contact you can cultivate and re-solicit.",
  },
]

function Value() {
  return (
    <section className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            What it&apos;s worth to your campaign
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            A bigger list, a warmer ask, more raised
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {VALUE.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-white p-8">
              <item.icon className="h-7 w-7 text-[#c4910a]" />
              <p className="mt-5 text-2xl font-black tracking-tight text-[#1b3a6b]">{item.stat}</p>
              <h3 className="mt-2 text-lg font-semibold text-[#1a1a2e]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Differentiators ─────────────────── */

function Differentiators() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Why it&apos;s different
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Donor research that connects to everything else
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          <Point title="Real filings, not a rented list">
            Every prospect comes from actual state and federal disclosure records — people who have
            demonstrably written checks to campaigns.
          </Point>
          <Point title="Research your whole field">
            Look up committees, candidates, and opponents to see who funds them — then go find those
            same donors for your race.
          </Point>
          <Point title="One system with your CRM">
            Linked donors become contacts, so giving history, outreach, and asks all live together
            instead of in a separate spreadsheet.
          </Point>
          <Point title="Save and replicate searches">
            Turn a winning search into a template and build your next prospect list in seconds — no
            starting from scratch.
          </Point>
        </div>
      </div>
    </section>
  )
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1b3a6b]/10 text-[#1b3a6b]">
        <Check className="h-4 w-4" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-[#1a1a2e]">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────── CTA ─────────────────────────── */

function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1b3a6b] to-[#0f2044] py-24 text-white">
      <div className="glow-gold pointer-events-none absolute -right-20 top-0 h-96 w-96" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop guessing. Start with proven donors.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Search state and federal records, build a real prospect list, and link it to your CRM.
          Start free — no consultant required.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={APP_URL}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-8 py-4 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/#platform"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            Explore the platform
          </Link>
        </div>
      </div>
    </section>
  )
}
