import Link from "next/link"
import type { Metadata } from "next"
import {
  Megaphone,
  Mail,
  MessageSquare,
  Newspaper,
  Heart,
  ThumbsUp,
  Printer,
  Wand2,
  DollarSign,
  Mic,
  Clock,
  Zap,
  Check,
  ArrowRight,
  Sparkles,
  PenLine,
  Quote,
  Fingerprint,
  BookOpen,
  Radar,
  Layers,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"

const APP_URL = "/sign-in"

export const metadata: Metadata = {
  title: "Communications — Engage",
  description:
    "Draft letters, op-eds, social posts, speeches, and print in your candidate's voice — in seconds. Trained on your writing samples, issue positions, and the latest campaign intelligence.",
}

export default function AICommunicationsPage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <Hero />
      <Problem />
      <ContentTypes />
      <TrainedOn />
      <SampleOutput />
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
            <Megaphone className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Communications
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          The communications team every campaign deserves — for the price of none.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          Big campaigns pay communications directors six figures to stay on message and move fast.
          Engage gives you the same firepower: letters, op-eds, social posts, and speeches drafted
          in your own voice — trained on your writing, your positions, and the latest news.
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
            href="#sample"
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
              The local campaign squeeze
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              You&apos;re the candidate, the manager, and the press shop
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Down-ballot campaigns run on nights and weekends. There&apos;s no comms director to
              turn a news story into a statement before the moment passes, no staffer to write the
              fundraising email, no agency to keep your message consistent across every channel.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              So the press release doesn&apos;t go out. The newsletter slips a week. The opponent
              defines you before you define yourself. Not because you lack the message — because you
              lack the hours.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">Without a comms team</p>
            <ul className="mt-5 space-y-4">
              {[
                "A breaking story sits unanswered for three days",
                "Each post sounds a little different from the last",
                "Writing from a blank page eats your only free evening",
                "Good ideas never become published content",
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
                  "A statement drafted minutes after the news breaks",
                  "Every piece on-message and on-brand, automatically",
                  "First drafts in seconds — you edit, not author",
                  "Every idea becomes ready-to-send content",
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

/* ─────────────────────── Content types ─────────────────────── */

const CONTENT_TYPES = [
  {
    icon: Mail,
    title: "Constituent letters",
    description: "Respond to constituents and make your case directly, in a warm, on-message letter.",
  },
  {
    icon: Newspaper,
    title: "Op-eds & letters to the editor",
    description: "Longer-form arguments for the local paper that make your case in your own words.",
  },
  {
    icon: Heart,
    title: "Donor thank-yous",
    description: "Prompt, personal gratitude that keeps donors close and ready to give again.",
  },
  {
    icon: ThumbsUp,
    title: "Endorsement requests",
    description: "Persuasive asks to unions, officials, and groups whose backing moves voters.",
  },
  {
    icon: MessageSquare,
    title: "Social posts",
    description: "Platform-tuned copy for Facebook, X, and Instagram — the right length and tone for each.",
  },
  {
    icon: Mic,
    title: "Speeches & remarks",
    description: "Stump speeches, town-hall openers, and event remarks that sound like you on stage.",
  },
  {
    icon: Printer,
    title: "Print materials",
    description: "Copy for palm cards, mailers, and flyers — ready to hand off to design or print.",
  },
  {
    icon: Wand2,
    title: "Refine & rewrite",
    description: "Paste a rough draft and tighten the tone, length, or message in a single pass.",
  },
]

function ContentTypes() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            One tool, every format
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Everything your campaign needs to say
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Pick a format, point it at an issue or a news hook, and get a finished first draft you
            can send as-is or make your own.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CONTENT_TYPES.map((type) => (
            <div
              key={type.title}
              className="group rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                <type.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1a1a2e]">{type.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {type.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────── Trained on your campaign ─────────────────── */

const TRAINED = [
  {
    icon: Fingerprint,
    title: "Your actual voice",
    description:
      "Upload real letters, posts, or speeches you've written — paste them, drop a file, or import from Google Docs — and every draft matches your style, not a generic AI tone.",
  },
  {
    icon: BookOpen,
    title: "Your issue positions",
    description:
      "Define the candidate's official stances once. Every generation is aligned to them, so a staffer and the candidate produce the same message.",
  },
  {
    icon: Radar,
    title: "Live campaign intelligence",
    description:
      "Add the latest news, research, and opponent moves as context notes. They're folded into your communications automatically — and expire when they're stale.",
  },
  {
    icon: Layers,
    title: "Organized by topic",
    description:
      "Group everything around a topic — occasion, audience, and key message — so your letters, posts, and speeches all stay on one consistent thread.",
  },
]

function TrainedOn() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f2044] to-[#1b3a6b] py-24 text-white">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="glow-gold pointer-events-none absolute -left-20 top-1/3 h-96 w-96" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Trained on your campaign
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Not generic AI. A writer that knows your race.
          </h2>
          <p className="mt-4 text-lg text-white/70">
            The difference between a draft you rewrite and a draft you send is context. Engage builds
            yours in — your voice, your positions, and the latest news — and applies it to every
            piece automatically.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRAINED.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#f0b429]">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Sample output ─────────────────────── */

function SampleOutput() {
  return (
    <section id="sample" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            From blank page to press-ready
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            You bring the moment. It brings the words.
          </h2>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
          {/* Inputs */}
          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
              <PenLine className="h-4 w-4 text-[#c4910a]" />
              What you give it
            </div>
            <dl className="mt-6 space-y-5">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Format
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#1a1a2e]">Op-ed / letter to the editor</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Topic
                </dt>
                <dd className="mt-1 text-sm font-medium text-[#1a1a2e]">Property tax relief</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Campaign intelligence
                </dt>
                <dd className="mt-1 text-sm text-[#1a1a2e]">
                  County legislature votes tonight on a 4.2% property tax increase
                </dd>
              </div>
            </dl>
            <div className="mt-6 rounded-lg border border-dashed border-[#c4910a]/40 bg-white p-3 text-xs text-muted-foreground">
              Your issue positions and writing samples are applied automatically — so it lands in
              your voice, on your message. You never re-type them.
            </div>
          </div>

          {/* Output */}
          <div className="relative overflow-hidden rounded-2xl border border-[#1b3a6b]/15 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-border bg-[#0f2044] px-5 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-[#f0b429]" />
                Drafted in 4 seconds
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
                Editable
              </span>
            </div>
            <div className="space-y-4 p-6 text-sm leading-relaxed text-[#1a1a2e]">
              <p className="text-base font-bold text-[#1a1a2e]">
                Stop Balancing the Budget on Working Families&apos; Backs
              </p>
              <p className="text-xs font-medium text-muted-foreground">By Maria Reyes</p>
              <p>
                Tonight, the County Legislature will vote on a 4.2% property tax increase. I&apos;m
                asking them to vote no — and to come back to the table with working families in mind.
              </p>
              <p className="border-l-2 border-[#c4910a] pl-4 italic text-muted-foreground">
                <Quote className="mb-1 inline h-4 w-4 text-[#c4910a]" /> We can fund our county
                without reaching deeper into the pockets of people who are already stretched thin.
              </p>
              <p className="text-muted-foreground">
                For five years, I&apos;ve watched neighbors get priced out of the place they call
                home. Another hike isn&apos;t leadership — it&apos;s the easy way out…
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Value ─────────────────────────── */

const VALUE = [
  {
    icon: Clock,
    stat: "Hours → minutes",
    title: "Win back your nights",
    description:
      "The work that used to eat an entire evening now takes the length of a coffee break. Spend your time at the doors, not the keyboard.",
  },
  {
    icon: Zap,
    stat: "Same-day response",
    title: "Move at the speed of news",
    description:
      "React while the story is still live. A statement that lands the same afternoon is worth ten that land next week.",
  },
  {
    icon: DollarSign,
    stat: "$0 vs. $60k+",
    title: "Comms-director output, volunteer budget",
    description:
      "Get the consistency and polish of a professional shop without a single new hire or retainer.",
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
            More message, more moments, more time
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

const POINTS = [
  {
    title: "Built for your whole team",
    description:
      "Every generation is saved to a shared library with who wrote what, so the candidate, staff, and volunteers all work from one place — not scattered docs.",
  },
  {
    title: "You always stay in control",
    description:
      "Each draft is fully editable, with a one-click refine to adjust tone, length, or message. The AI gets you to 90% in seconds; the last 10% is all you.",
  },
  {
    title: "On message across every format",
    description:
      "The same voice and positions drive your letters, posts, and speeches, so your message stays consistent whether it's a mailer or a microphone.",
  },
  {
    title: "Fast enough for the news cycle",
    description:
      "Drop in a breaking story as campaign intelligence and respond the same afternoon — while it's still the story everyone's talking about.",
  },
]

function Differentiators() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Why it&apos;s different
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Built to fit how a campaign actually works
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {POINTS.map((point) => (
            <div key={point.title} className="flex gap-4">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1b3a6b]/10 text-[#1b3a6b]">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-[#1a1a2e]">{point.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── CTA ─────────────────────────── */

function CTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1b3a6b] to-[#0f2044] py-24 text-white">
      <div className="glow-gold pointer-events-none absolute -right-20 top-0 h-96 w-96" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Put a press shop in your pocket
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Add your positions and a writing sample, then generate your first piece in minutes. Start
          free — no credit card, no consultants.
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
