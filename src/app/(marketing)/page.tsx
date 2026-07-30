import Link from "next/link"
import {
  Megaphone,
  Globe,
  Mail,
  Users,
  Map,
  HandCoins,
  ArrowRight,
  Check,
  Sparkles,
  PenLine,
  Send,
  BarChart3,
  Clock,
  ShieldCheck,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"

export default function HomePage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <Hero />
      <Pillars />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCTA />
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
      <div className="glow-navy pointer-events-none absolute -bottom-40 -left-32 h-[520px] w-[520px]" />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm font-medium text-white/80">
          <Sparkles className="h-4 w-4 text-[#f0b429]" />
          The complete platform for down-ballot campaigns
        </div>

        <h1 className="animate-fade-up mt-8 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Run a winning campaign
          <br />
          with <span className="text-gradient-gold">one platform</span>
        </h1>

        <p className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg text-white/70">
          Engage gives local candidates everything the big campaigns have — AI-powered
          communications, a polished website, voter outreach, fundraising, and field tools —
          without the consultants or the price tag.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#platform"
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            See the platform
          </a>
        </div>

        <p className="animate-fade-up mt-6 text-sm text-white/50">
          No credit card required · Set up in minutes
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────── Platform pillars ─────────────────────── */

const PILLARS: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href?: string
}[] = [
  {
    icon: Megaphone,
    title: "AI Communications",
    description:
      "Draft press releases, emails, social posts, and talking points in your voice — in seconds, not hours.",
    href: "/platform/ai-communications",
  },
  {
    icon: Globe,
    title: "Candidate Websites",
    description:
      "Launch a professional, mobile-ready campaign site with your branding, issues, and donate links built in.",
    href: "/platform/candidate-websites",
  },
  {
    icon: Mail,
    title: "Newsletter",
    description:
      "Build an email list on your site and send newsletters your supporters actually read — free to start.",
    href: "/platform/newsletter",
  },
  {
    icon: Users,
    title: "Voter Outreach",
    description:
      "Reach the right voters with targeted email and text, powered by your district's voter file.",
    href: "/platform/voter-outreach",
  },
  {
    icon: HandCoins,
    title: "Fundraising",
    description:
      "Find proven donors with state and federal records, research who funds similar campaigns, and link them to your CRM.",
    href: "/platform/fundraising",
  },
  {
    icon: Map,
    title: "Field Tools",
    description:
      "Cut turf, organize canvasses, and track every door your volunteers knock — all in one place.",
    href: "/platform/field-tools",
  },
]

function Pillars() {
  return (
    <section id="platform" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            One platform, six pillars
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Everything your campaign needs to win
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Stop stitching together a dozen tools. Engage replaces them with one
            system built for local campaigns.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Communications and websites work in every state. Voter data, fundraising, and field
            tools are live in New York and rolling out state by state.
          </p>
        </div>

        <div className="mt-16 flex flex-wrap justify-center gap-6">
          {PILLARS.map((pillar) => {
            const cardClass =
              "group flex h-full w-full flex-col rounded-2xl border border-border bg-white p-6 transition-all hover:border-[#c4910a]/40 hover:shadow-lg sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            const inner = (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1b3a6b]/5 text-[#1b3a6b] transition-colors group-hover:bg-[#1b3a6b] group-hover:text-white">
                  <pillar.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#1a1a2e]">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
                {pillar.href && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#c4910a]">
                    Learn more
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                )}
              </>
            )
            return pillar.href ? (
              <Link key={pillar.title} href={pillar.href} className={cardClass}>
                {inner}
              </Link>
            ) : (
              <div key={pillar.title} className={cardClass}>
                {inner}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Features ───────────────────────── */

const FEATURES = [
  {
    icon: PenLine,
    title: "Sounds like you",
    description:
      "Set up your profile once — your bio, your issues, your voice — and every draft comes out on-message and on-brand.",
  },
  {
    icon: Clock,
    title: "Built for speed",
    description:
      "Respond to the news cycle while it's still the news cycle. What took a staffer all afternoon now takes a minute.",
  },
  {
    icon: Send,
    title: "Publish anywhere",
    description:
      "Export to email, social, print, or your website. Your content flows to every channel from a single place.",
  },
  {
    icon: BarChart3,
    title: "Know what's working",
    description:
      "See which messages land and which voters you've reached, so every dollar and hour goes further.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance-aware",
    description:
      "Disclaimers, committee info, and paid-for lines are handled automatically across your materials.",
  },
  {
    icon: Sparkles,
    title: "No experience needed",
    description:
      "If you can fill out a form, you can run a modern campaign. No consultants, no agencies, no learning curve.",
  },
]

function Features() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Why campaigns choose us
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            The advantages of a war room, on a volunteer budget
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <feature.icon className="h-6 w-6 text-[#c4910a]" />
              <h3 className="mt-4 text-lg font-semibold text-[#1a1a2e]">{feature.title}</h3>
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
    number: "01",
    title: "Set up your campaign",
    description:
      "Tell us about the candidate, the office, and your key issues. It takes about five minutes.",
  },
  {
    number: "02",
    title: "Generate and launch",
    description:
      "Spin up your website and your first communications instantly — all on-brand and ready to ship.",
  },
  {
    number: "03",
    title: "Reach voters and win",
    description:
      "Send, post, canvass, and track. Engage keeps every part of your campaign moving.",
  },
]

function HowItWorks() {
  return (
    <section id="how" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            From kickoff to election day in three steps
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-5xl font-black text-[#1b3a6b]/10">{step.number}</div>
              <h3 className="mt-3 text-xl font-semibold text-[#1a1a2e]">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Pricing ───────────────────────── */

const TIERS = [
  {
    name: "Starter",
    price: "Free",
    cadence: "",
    description: "For first-time candidates getting organized.",
    features: ["AI communications", "Basic candidate website", "Up to 25 generations / month"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Campaign",
    price: "$49",
    cadence: "/month",
    description: "For serious campaigns ready to scale outreach.",
    features: [
      "Everything in Starter",
      "Unlimited generations",
      "Voter outreach (email + text)",
      "Custom domain & branding",
      "Field & canvassing tools",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Committee",
    price: "Custom",
    cadence: "",
    description: "For party committees and multi-candidate slates.",
    features: [
      "Everything in Campaign",
      "Multiple candidates",
      "Shared voter data",
      "Dedicated support",
    ],
    cta: "Contact us",
    featured: false,
  },
]

function Pricing() {
  return (
    <section id="pricing" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">Pricing</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Priced for the campaigns that need it most
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                tier.featured
                  ? "border-[#c4910a] bg-white shadow-xl ring-1 ring-[#c4910a]/30"
                  : "border-border bg-white"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-3 py-1 text-xs font-semibold text-[#0f2044]">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-[#1a1a2e]">{tier.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-black text-[#1a1a2e]">{tier.price}</span>
                {tier.cadence && (
                  <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                )}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{tier.description}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#1a1a2e]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c4910a]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-in"
                className={`mt-8 inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition-all ${
                  tier.featured
                    ? "bg-gradient-to-br from-[#f0b429] to-[#c4910a] text-[#0f2044] hover:scale-[1.03]"
                    : "border border-[#1b3a6b] text-[#1b3a6b] hover:bg-[#1b3a6b] hover:text-white"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Final CTA ───────────────────────── */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1b3a6b] to-[#0f2044] py-24 text-white">
      <div className="glow-gold pointer-events-none absolute -right-20 top-0 h-96 w-96" />
      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Your opponent has a team. Now so do you.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Join the local candidates running smarter campaigns with Engage. Get started in
          minutes — it&apos;s free.
        </p>
        <div className="mt-10">
          <Link
            href="/sign-in"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-8 py-4 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
