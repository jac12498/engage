import Link from "next/link"
import type { Metadata } from "next"
import {
  Users,
  Database,
  SlidersHorizontal,
  Mail,
  MessageSquare,
  ListChecks,
  Target,
  Phone,
  BarChart3,
  Check,
  ArrowRight,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { CoverageBadge } from "@/components/marketing/CoverageNotice"

const APP_URL = "/sign-in"

export const metadata: Metadata = {
  title: "Voter Outreach — Engage",
  description:
    "Reach the right voters with targeted email and text, powered by your district's voter file. Segment in seconds, contact who matters, and track every touch.",
}

export default function VoterOutreachPage() {
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
            <Users className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Voter Outreach
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          Reach the right voters — not every voter.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          Your district&apos;s voter file, built in. Target by party, turnout history, geography,
          and more, then reach them by email and text — so every message and every dollar lands
          where it counts.
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

        <div className="animate-fade-up mt-8">
          <CoverageBadge />
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
              Spray and pray doesn&apos;t win
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              You can&apos;t talk to everyone. So talk to the right ones.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Most local campaigns either blast the same message to a borrowed email list or have no
              way to reach voters at all. Without the voter file, there&apos;s no way to tell a
              committed supporter from a lean opponent — so money gets spent contacting people who
              were never going to vote for you.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              The campaigns that win know exactly who to persuade, who to turn out, and who to skip.
              That targeting used to require a data director. Now it&apos;s a few clicks.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">Outreach without data</p>
            <ul className="mt-5 space-y-4">
              {[
                "One generic message blasted to everyone",
                "Dollars spent contacting voters who'll never flip",
                "No idea who you've already reached",
                "Supporters left un-mobilized on election day",
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
                  "The right message to the right segment",
                  "Spend focused on persuadable and base voters",
                  "Every contact tracked across email and text",
                  "A clear turnout list for get-out-the-vote",
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
    icon: Database,
    title: "Your district's voter file",
    description: "Search the registered voters in your race — names, addresses, and vote history, built in.",
  },
  {
    icon: SlidersHorizontal,
    title: "Targeting & segments",
    description: "Filter by party, age, geography, and turnout score to build the exact audience you need.",
  },
  {
    icon: Mail,
    title: "Email outreach",
    description: "Send persuasion and supporter emails to any segment, straight from your lists.",
  },
  {
    icon: MessageSquare,
    title: "Text messaging",
    description: "Reach voters one-to-one at scale with peer-to-peer texts that actually get read.",
  },
  {
    icon: ListChecks,
    title: "Saved lists & tags",
    description: "Build, tag, and reuse audiences — supporters, volunteers, donors, undecideds.",
  },
  {
    icon: Phone,
    title: "Contact enrichment",
    description: "Append phone and email to your voter records so you can actually reach people.",
  },
  {
    icon: Target,
    title: "Turnout & GOTV",
    description: "Surface low-propensity supporters and drive them to the polls when it matters most.",
  },
  {
    icon: BarChart3,
    title: "Tracking & analytics",
    description: "See who you've reached, what's working, and where to spend your next hour.",
  },
]

function Capabilities() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            A data team in a dashboard
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Everything you need to find and reach voters
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the voter file to the send button, it&apos;s all in one place — and it shares data
            with your field team automatically. Voter data is live in New York today and rolling
            out state by state.
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

/* ─────────────────────── Audience preview ─────────────────────── */

const FILTERS = [
  { label: "Party", value: "Democrat" },
  { label: "District", value: "Legislative 23" },
  { label: "Turnout score", value: "2–3 of 4 elections" },
  { label: "Age", value: "30 – 55" },
]

function Preview() {
  return (
    <section id="preview" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Build an audience in seconds
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Point your message at exactly the right voters
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
          {/* Filters */}
          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
              <SlidersHorizontal className="h-4 w-4 text-[#c4910a]" />
              Your filters
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
          </div>

          {/* Result */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-[#1b3a6b]/15 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-[#0f2044] px-5 py-3 text-white">
              <span className="text-sm font-semibold">Matching voters</span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
                Live count
              </span>
            </div>
            <div className="flex flex-1 flex-col justify-center p-8 text-center">
              <p className="text-5xl font-black tracking-tight text-[#1b3a6b]">12,480</p>
              <p className="mt-2 text-sm text-muted-foreground">
                voters match — out of 61,200 in the district
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <span className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1b3a6b] px-5 py-2.5 text-sm font-semibold text-white">
                  <Mail className="h-4 w-4" />
                  Email this segment
                </span>
                <span className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#1b3a6b] px-5 py-2.5 text-sm font-semibold text-[#1b3a6b]">
                  <MessageSquare className="h-4 w-4" />
                  Text this segment
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Every voter you contact is tracked — and shared with your field team so no one gets a
          knock and a text for the same ask.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────── Value ─────────────────────────── */

const VALUE = [
  {
    icon: Target,
    stat: "Talk to who matters",
    title: "Persuasion, not noise",
    description:
      "Aim your budget at the voters who can actually be moved or turned out — and stop paying to reach the rest.",
  },
  {
    icon: Database,
    stat: "Voter file included",
    title: "No data director required",
    description:
      "The registered-voter data that big campaigns pay consultants for is built into the platform from day one.",
  },
  {
    icon: BarChart3,
    stat: "Every touch tracked",
    title: "Know what's working",
    description:
      "See reach and response across email and text so each round of outreach is smarter than the last.",
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
            More votes per dollar, per hour, per message
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
            Real voter data, one shared system
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          <Point title="Built on the actual voter file">
            Not a purchased email blast — real registered-voter records for your district, with the
            history that makes targeting possible.
          </Point>
          <Point title="One file with your field team">
            Outreach and{" "}
            <Link href="/platform/field-tools" className="font-medium text-[#1b3a6b] underline">
              Field Tools
            </Link>{" "}
            read and write the same voter data, so a text and a door knock never duplicate the same
            ask.
          </Point>
          <Point title="Segment in seconds">
            Build a precise audience with a few filters — no spreadsheets, no SQL, no waiting on a
            consultant.
          </Point>
          <Point title="Compliance-aware">
            Opt-outs and contact rules are respected across channels, so you stay on the right side
            of the line.
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
          Find your voters. Reach your voters.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Put your district&apos;s voter file to work with targeted email and text. Start free — no
          data director, no consultant.
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
