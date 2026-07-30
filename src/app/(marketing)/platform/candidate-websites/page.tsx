import Link from "next/link"
import type { Metadata } from "next"
import {
  Globe,
  Smartphone,
  Palette,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Search,
  ShieldCheck,
  Rocket,
  RefreshCw,
  Check,
  ArrowRight,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  LayoutGrid,
  MousePointerClick,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"

export const metadata: Metadata = {
  title: "Candidate Websites — Engage",
  description:
    "Launch a professional, mobile-ready campaign website in minutes — your branding, issues, and donate links built in, always in sync with the rest of your campaign.",
}

export default function CandidateWebsitesPage() {
  return (
    <div className="bg-white">
      <SiteHeader />
      <Hero />
      <Problem />
      <Includes />
      <Preview />
      <Customize />
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
            <Globe className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Candidate Websites
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          A professional campaign website — live before lunch.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          No web developer. No $3,000 invoice. No six-week wait. Engage turns your campaign
          profile into a polished, mobile-ready website with your branding, your issues, and a
          donate button front and center — ready to publish today.
        </p>

        <div className="animate-fade-up mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-6 py-3 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#preview"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
          >
            See a preview
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
              The website gap
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              Voters Google you. What do they find?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              For most down-ballot candidates, the answer is a Facebook page, a half-finished free
              site, or nothing at all. Meanwhile the donate link is buried, the platform is nowhere
              to be found, and the whole thing looks broken on a phone.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              A real website used to mean hiring a developer and waiting weeks. By the time it
              launched, the campaign had moved on. So the site never came — and every voter who
              looked you up left without donating, volunteering, or learning where you stand.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">The usual options</p>
            <ul className="mt-5 space-y-4">
              {[
                "A free site builder that looks like a free site builder",
                "$2,000–$5,000 and a multi-week wait for a freelancer",
                "A site you can't update without emailing the developer",
                "Nothing — just a social page and a prayer",
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
                  "A polished, professional site in minutes — not weeks",
                  "Built in, no separate cost or contractor",
                  "Edit your profile and the site updates itself",
                  "Donate and volunteer front and center on every page",
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

/* ─────────────────────── What's included ─────────────────────── */

const INCLUDES = [
  {
    icon: Palette,
    title: "Your branding",
    description: "Your colors, logo, headshot, and tagline applied across the whole site automatically.",
  },
  {
    icon: FileText,
    title: "Issues & platform",
    description: "Your saved positions become clean, persuasive policy pages — no extra writing.",
  },
  {
    icon: DollarSign,
    title: "Donate built in",
    description: "An ActBlue-ready donate button on every page so support is always one click away.",
  },
  {
    icon: Users,
    title: "Volunteer sign-ups",
    description: "Capture supporters, volunteers, and emails with forms that feed your outreach lists.",
  },
  {
    icon: Smartphone,
    title: "Flawless on mobile",
    description: "Most voters look you up on a phone. Your site looks sharp on every screen size.",
  },
  {
    icon: Calendar,
    title: "Events & updates",
    description: "Promote rallies, town halls, and announcements right alongside your message.",
  },
  {
    icon: Search,
    title: "SEO & social cards",
    description: "Show up in search and look professional every time your link gets shared.",
  },
  {
    icon: ShieldCheck,
    title: "Fast & secure hosting",
    description: "SSL, speed, and a custom domain handled for you — nothing to configure.",
  },
]

function Includes() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            Everything, out of the box
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            A complete campaign site, not a blank template
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            You don&apos;t design a thing. Fill out your profile once and every page is built,
            branded, and connected for you.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {INCLUDES.map((item) => (
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

/* ─────────────────────── Website preview ─────────────────────── */

function Preview() {
  return (
    <section id="preview" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            From profile to published
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Your campaign, looking like it has a budget
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            The same profile that powers your communications builds your site. Here&apos;s what
            voters see.
          </p>
        </div>

        {/* Browser mock */}
        <div className="mx-auto mt-16 max-w-3xl overflow-hidden rounded-2xl border border-[#1b3a6b]/15 bg-white shadow-2xl">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-[#f4f6f9] px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]" />
            <div className="ml-3 flex flex-1 items-center justify-center rounded-md border border-border bg-white px-3 py-1 text-xs text-muted-foreground">
              mariareyes.com
            </div>
          </div>

          {/* Site nav */}
          <div className="flex items-center justify-between bg-white px-6 py-4">
            <span className="text-base font-bold text-[#1b3a6b]">Maria Reyes</span>
            <div className="hidden gap-5 text-xs font-medium text-muted-foreground sm:flex">
              <span>About</span>
              <span>Issues</span>
              <span>Events</span>
            </div>
            <span className="rounded-md bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-3 py-1.5 text-xs font-semibold text-[#0f2044]">
              Donate
            </span>
          </div>

          {/* Site hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#0f2044] to-[#1b3a6b] px-6 py-12 text-center text-white">
            <div className="glow-gold pointer-events-none absolute -right-10 -top-10 h-48 w-48" />
            <p className="relative text-xs font-semibold uppercase tracking-wider text-[#f0b429]">
              For County Legislature · District 23
            </p>
            <p className="relative mt-2 text-3xl font-black tracking-tight">Maria Reyes</p>
            <p className="relative mt-2 text-sm text-white/70">
              Fighting for working families in Ulster County
            </p>
            <div className="relative mt-6 flex items-center justify-center gap-3">
              <span className="rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-5 py-2 text-sm font-semibold text-[#0f2044]">
                Donate
              </span>
              <span className="rounded-lg border border-white/30 px-5 py-2 text-sm font-semibold text-white">
                Volunteer
              </span>
            </div>
          </div>

          {/* Issues strip */}
          <div className="grid gap-3 bg-white px-6 py-6 sm:grid-cols-3">
            {["Property Tax Relief", "Affordable Housing", "Good Local Jobs"].map((issue) => (
              <div key={issue} className="rounded-lg border border-border p-3">
                <div className="h-1.5 w-8 rounded-full bg-[#c4910a]" />
                <p className="mt-2 text-sm font-semibold text-[#1a1a2e]">{issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">Where Maria stands →</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Built automatically from your profile — change a color or an issue and the site updates
          instantly.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────── Customizations ─────────────────────── */

const PALETTES = [
  ["#1b3a6b", "#c4910a"],
  ["#1e6b3a", "#f0b429"],
  ["#7c3aed", "#ea580c"],
  ["#0d9488", "#be185d"],
  ["#b91c1c", "#1e3a8a"],
]

const THEMES = ["Classic", "Bold", "Grassroots"]
const FONTS = ["Modern Sans", "Classic Serif", "Editorial", "Friendly"]
const SECTIONS = [
  { label: "Issues", on: true },
  { label: "Endorsements", on: true },
  { label: "Events", on: true },
  { label: "News", on: false },
  { label: "Volunteer", on: true },
  { label: "Photo gallery", on: false },
]

function Customize() {
  return (
    <section id="customize" className="relative overflow-hidden bg-gradient-to-b from-[#0f2044] to-[#1b3a6b] py-24 text-white">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="glow-gold pointer-events-none absolute -left-20 top-1/3 h-96 w-96" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Make it yours
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Polished defaults, real choices
          </h2>
          <p className="mt-4 text-lg text-white/70">
            We start you with a professional site automatically — then let you tune the look to fit
            your campaign. No design skills required.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Theme & layout */}
          <CustomCard
            icon={LayoutTemplate}
            title="Theme & layout"
            description="Choose a style that matches your race — from buttoned-up to grassroots energy."
          >
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => (
                <div key={theme} className="rounded-md border border-white/15 bg-white/5 p-1.5">
                  <div className="h-1.5 w-6 rounded bg-[#f0b429]/80" />
                  <div className="mt-1 h-4 rounded bg-white/10" />
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <div className="h-1.5 rounded bg-white/10" />
                    <div className="h-1.5 rounded bg-white/10" />
                  </div>
                  <p className="mt-1.5 text-center text-[10px] font-medium text-white/60">{theme}</p>
                </div>
              ))}
            </div>
          </CustomCard>

          {/* Color palette */}
          <CustomCard
            icon={Palette}
            title="Color palette"
            description="Set your primary and accent colors, or pick a ready-made pairing that pops."
          >
            <div className="flex flex-wrap gap-2.5">
              {PALETTES.map(([primary, accent]) => (
                <div
                  key={primary}
                  className="flex items-center overflow-hidden rounded-full border border-white/15"
                >
                  <span className="h-7 w-7" style={{ backgroundColor: primary }} />
                  <span className="h-7 w-7" style={{ backgroundColor: accent }} />
                </div>
              ))}
            </div>
          </CustomCard>

          {/* Typography */}
          <CustomCard
            icon={Type}
            title="Typography"
            description="Pick a typeface with the right personality — modern, classic, or editorial."
          >
            <div className="flex flex-wrap gap-2">
              {FONTS.map((font, i) => (
                <span
                  key={font}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    i === 0
                      ? "border-[#f0b429]/50 bg-[#f0b429]/10 font-semibold text-white"
                      : "border-white/15 text-white/70"
                  }`}
                >
                  {font}
                </span>
              ))}
            </div>
          </CustomCard>

          {/* Hero style */}
          <CustomCard
            icon={ImageIcon}
            title="Hero style"
            description="Lead with a photo, a bold color gradient, or a split layout — your call."
          >
            <div className="grid grid-cols-3 gap-2">
              <HeroVariant label="Photo">
                <div className="h-full w-full bg-white/15" />
              </HeroVariant>
              <HeroVariant label="Gradient">
                <div className="h-full w-full bg-gradient-to-br from-[#1b3a6b] to-[#c4910a]" />
              </HeroVariant>
              <HeroVariant label="Split">
                <div className="flex h-full w-full">
                  <div className="h-full w-1/2 bg-white/15" />
                  <div className="h-full w-1/2 bg-[#f0b429]/40" />
                </div>
              </HeroVariant>
            </div>
          </CustomCard>

          {/* Sections to show */}
          <CustomCard
            icon={LayoutGrid}
            title="Sections to show"
            description="Turn pages on or off so your site shows exactly what your campaign needs."
          >
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((section) => (
                <span
                  key={section.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                    section.on
                      ? "bg-[#1e6b3a]/30 text-white"
                      : "border border-white/15 text-white/45"
                  }`}
                >
                  {section.on && <Check className="h-3 w-3 text-[#2d9e56]" />}
                  {section.label}
                </span>
              ))}
            </div>
          </CustomCard>

          {/* Primary call to action */}
          <CustomCard
            icon={MousePointerClick}
            title="Primary call to action"
            description="Decide what every page pushes hardest — raising money or recruiting volunteers."
          >
            <div className="flex gap-2.5">
              <span className="flex-1 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-3 py-2 text-center text-sm font-semibold text-[#0f2044]">
                Donate-first
              </span>
              <span className="flex-1 rounded-lg border border-white/25 px-3 py-2 text-center text-sm font-semibold text-white/80">
                Volunteer-first
              </span>
            </div>
          </CustomCard>
        </div>
      </div>
    </section>
  )
}

function CustomCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 text-[#f0b429]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  )
}

function HeroVariant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="h-10 overflow-hidden rounded-md border border-white/15">{children}</div>
      <p className="mt-1.5 text-center text-[10px] font-medium text-white/60">{label}</p>
    </div>
  )
}

/* ─────────────────────────── Value ─────────────────────────── */

const VALUE = [
  {
    icon: Rocket,
    stat: "Minutes, not weeks",
    title: "Launch while it matters",
    description:
      "Announce, then point everyone to a real website the same day. No dev queue, no delay between deciding and being online.",
  },
  {
    icon: DollarSign,
    stat: "$0 vs. $3,000+",
    title: "Skip the freelancer invoice",
    description:
      "A site that would cost thousands and weeks from an agency is included — and it never sends you a change-request bill.",
  },
  {
    icon: RefreshCw,
    stat: "Always current",
    title: "One edit updates everything",
    description:
      "New endorsement or position? Update your profile once and your website — and your communications — reflect it instantly.",
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
            A credible home base, working for you 24/7
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
    title: "One profile powers everything",
    description:
      "Your bio, issues, and branding live in one place and flow to your website, your press releases, and your outreach — never out of sync.",
  },
  {
    title: "Built to convert, not just to exist",
    description:
      "Donate and volunteer actions are designed into every page, so a curious voter becomes a donor or a doorknocker.",
  },
  {
    title: "Professional by default",
    description:
      "Thoughtful typography, real branding, and a mobile-first layout mean you look the part from the first click.",
  },
  {
    title: "You're never locked out",
    description:
      "Update content yourself anytime in seconds. No tickets, no waiting on a developer, no stale information.",
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
            Not a template you fill in. A site that builds itself.
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
          Give voters somewhere to land
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Set up your profile and publish a website your campaign can be proud of — today. Start
          free, no credit card, no developer.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-in"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#f0b429] to-[#c4910a] px-8 py-4 text-base font-semibold text-[#0f2044] transition-transform hover:scale-[1.03]"
          >
            Start free today
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
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
