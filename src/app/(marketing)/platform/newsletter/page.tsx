import Link from "next/link"
import type { Metadata } from "next"
import {
  Mail,
  Users,
  PenLine,
  Send,
  Archive,
  ShieldCheck,
  BadgeCheck,
  MousePointerClick,
  Sparkles,
  Check,
  ArrowRight,
  Inbox,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"

export const metadata: Metadata = {
  title: "Newsletter — Engage",
  description:
    "Build an email list on your campaign site and send newsletters your supporters actually read — with double opt-in, one-click unsubscribe, and AI drafting. Free to start.",
}

export default function NewsletterPage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <Hero />
      <Why />
      <Features />
      <HowItWorks />
      <FreeTier />
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
            <Mail className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Newsletter
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          Own your list. Land in every inbox.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          Social platforms rent you your audience and bury your posts. A newsletter is the one
          channel you own outright — a direct line to every supporter who asked to hear from you.
          Engage gives you the whole thing: a signup form, a subscriber list, and one-click sending —
          free to start.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            href="/sign-in"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a
            href="#how"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            See how it works
          </a>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────── Why a newsletter ─────────────────────── */

function Why() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
              The channel you actually own
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              Don&apos;t rent your supporters. Own the relationship.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              When you post on social, an algorithm decides how many of your own followers ever see
              it. When you send a newsletter, it goes to every person on your list — no gatekeeper,
              no pay-to-boost, no guessing.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              For a local campaign, that list is one of the most valuable assets you can build. It
              turns a one-time visitor into a supporter you can reach again and again — for a volunteer
              ask, an event, or an election-day reminder.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">Social media</p>
            <ul className="mt-5 space-y-4">
              {[
                "The platform decides who sees your posts",
                "Reach drops unless you pay to boost",
                "You can't export or truly own your followers",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 border-t border-border pt-6">
              <p className="text-sm font-semibold text-[#1a1a2e]">Your newsletter</p>
              <ul className="mt-5 space-y-4">
                {[
                  "Every issue reaches every confirmed subscriber",
                  "No algorithm, no ad spend to be seen",
                  "The list is yours — supporters who opted in",
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

/* ─────────────────────── Features ─────────────────────── */

const FEATURES = [
  {
    icon: Users,
    title: "Signup forms built in",
    description:
      "Drop a subscribe form onto your campaign site — or let visitors sign up right from your public newsletter archive. No extra setup.",
  },
  {
    icon: BadgeCheck,
    title: "Double opt-in",
    description:
      "Every subscriber confirms by email, so your list stays clean and real — which keeps your future emails out of the spam folder.",
  },
  {
    icon: Sparkles,
    title: "AI-drafted issues",
    description:
      "Describe what to cover and get a full first draft in your voice — the same engine behind your AI Communications, tuned for email.",
  },
  {
    icon: Archive,
    title: "Public archive",
    description:
      "Every published issue gets a clean, shareable web page, so new visitors can read past newsletters and subscribe on the spot.",
  },
  {
    icon: MousePointerClick,
    title: "One-click unsubscribe",
    description:
      "A working one-click unsubscribe in every send keeps you compliant with Gmail and Yahoo's rules — and on the right side of your readers.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance handled",
    description:
      "Your committee's required disclaimer and mailing address are added to every footer automatically. No legal fine print to remember.",
  },
]

function Features() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Everything a list needs
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            A real email program, without the enterprise price tag
          </h2>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1a1a2e]">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────── How it works ──────────────────────── */

const STEPS = [
  {
    icon: Users,
    number: "01",
    title: "Collect subscribers",
    description:
      "Add a signup form to your site. Visitors confirm by email and join your list — no spreadsheets, no manual imports.",
  },
  {
    icon: PenLine,
    number: "02",
    title: "Write your issue",
    description:
      "Draft it yourself or let AI write a first pass in your voice. Publish it to your archive when it's ready.",
  },
  {
    icon: Send,
    number: "03",
    title: "Send to everyone",
    description:
      "One click delivers your issue to every confirmed subscriber — with unsubscribe and disclaimers handled for you.",
  },
]

function HowItWorks() {
  return (
    <section id="how" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            From first subscriber to sent issue
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b]">
                  <step.icon className="h-5 w-5" />
                </span>
                <span className="text-4xl font-black text-[#1b3a6b]/10">{step.number}</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold text-[#1a1a2e]">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ──────────────────────── Free tier ──────────────────────── */

function FreeTier() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0f2044] to-[#1b3a6b] py-24 text-white">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="glow-gold pointer-events-none absolute -left-20 top-1/3 h-96 w-96" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
          <Inbox className="h-4 w-4 text-[#f0b429]" />
          Free on the Starter plan
        </span>
        <h2 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Start your list for free — up to 250 subscribers
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Build an audience and send real newsletters without paying a cent. When your list outgrows
          the free tier, Campaign lifts the cap and raises your send volume.
        </p>
        <div className="mt-10">
          <a
            href="/sign-in"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-8 py-4 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
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
          Your supporters are one email away
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Add a signup form, send your first issue, and start building the one audience no platform
          can take from you. Free to start — no credit card.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/sign-in"
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
