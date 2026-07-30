import Link from "next/link"
import type { Metadata } from "next"
import {
  Map as MapIcon,
  Scissors,
  Route,
  Smartphone,
  ClipboardList,
  Activity,
  Users,
  RefreshCw,
  Check,
  ArrowRight,
} from "lucide-react"
import { SiteHeader } from "@/components/marketing/SiteHeader"
import { SiteFooter } from "@/components/marketing/SiteFooter"
import { CoverageBadge } from "@/components/marketing/CoverageNotice"

const APP_URL = "/sign-in"

export const metadata: Metadata = {
  title: "Field Tools — Engage",
  description:
    "Cut turf, organize canvasses, and track every door your volunteers knock. A mobile canvassing app and turf-cutting tools that sync straight to your voter file.",
}

export default function FieldToolsPage() {
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
            <MapIcon className="h-6 w-6" />
          </span>
          <span className="text-sm font-semibold uppercase tracking-wider text-[#f0b429]">
            Field Tools
          </span>
        </div>

        <h1 className="animate-fade-up mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl">
          Turn volunteers into a knockout ground game.
        </h1>

        <p className="animate-fade-up mt-6 max-w-2xl text-lg text-white/70">
          Cut walkable turf in minutes, send volunteers out with a simple app that works at the
          door, and watch every knock land back in your voter file in real time. No clipboards, no
          data entry, no doors knocked twice.
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
              The clipboard tax
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
              Your volunteers showed up. Don&apos;t waste their time.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Paper walk lists, a highlighter on a folded map, and a shoebox of marked-up sheets that
              someone has to type in later — if they ever do. Volunteers knock the same doors twice,
              the data never makes it back, and you go into election day guessing what got covered.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Field is the highest-impact thing a local campaign can do. It deserves better than a
              clipboard.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-[#f4f6f9] p-8">
            <p className="text-sm font-semibold text-[#1a1a2e]">Canvassing on paper</p>
            <ul className="mt-5 space-y-4">
              {[
                "Hours cutting turf by hand on a paper map",
                "Volunteers knocking the same doors twice",
                "An evening of manual data entry afterward",
                "No idea what's been covered until it's too late",
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
                  "Walkable turf cut in minutes on a map",
                  "Each door assigned once, tracked in real time",
                  "Responses captured at the door — no re-entry",
                  "Live coverage you can see from anywhere",
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
    icon: Scissors,
    title: "Turf cutting",
    description: "Draw or auto-cut walkable territories on a map in minutes — balanced and ready to assign.",
  },
  {
    icon: Route,
    title: "Optimized walk lists",
    description: "Each turf becomes an efficient door-by-door route so volunteers cover more ground.",
  },
  {
    icon: Smartphone,
    title: "Canvasser app",
    description: "A dead-simple mobile app volunteers use at the door — works even with spotty signal.",
  },
  {
    icon: ClipboardList,
    title: "Scripts & surveys",
    description: "Capture support level, issues, and IDs at the door with tap-friendly questions.",
  },
  {
    icon: Activity,
    title: "Real-time progress",
    description: "Watch doors knocked and turfs completed update live as your team works.",
  },
  {
    icon: Users,
    title: "Volunteer management",
    description: "Assign turf, see who's out, and keep your whole field team organized in one place.",
  },
  {
    icon: RefreshCw,
    title: "Instant voter sync",
    description: "Every door response writes straight to your voter file — no spreadsheets, no re-entry.",
  },
  {
    icon: MapIcon,
    title: "Coverage maps",
    description: "See exactly where you've been and where to send the next shift across your district.",
  },
]

function Capabilities() {
  return (
    <section id="features" className="bg-[#f4f6f9] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            From map to doorstep
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Everything your ground game needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Cut turf, send volunteers out, and capture every conversation — all connected to the
            same voter file your outreach uses. Available in states where we have the voter file —
            live in New York today, expanding from there.
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

/* ─────────────────────── Turf preview ─────────────────────── */

const TURFS = [
  { id: "A", points: "20,30 130,20 150,90 40,110", fill: "#1b3a6b", done: true },
  { id: "B", points: "130,20 250,35 240,110 150,90", fill: "#c4910a", done: true },
  { id: "C", points: "40,110 150,90 160,180 60,195", fill: "#1e6b3a", done: false },
  { id: "D", points: "150,90 240,110 250,190 160,180", fill: "#7c3aed", done: false },
]

const DOORS = [
  [70, 55], [100, 45], [60, 85], [110, 75], [165, 55], [200, 50], [185, 90], [215, 80],
  [80, 140], [120, 130], [95, 165], [130, 160], [185, 140], [210, 155], [195, 175],
]

function Preview() {
  return (
    <section id="preview" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-[#c4910a]">
            See your whole ground game
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#1a1a2e] sm:text-4xl">
            Turf cut, doors tracked, coverage at a glance
          </h2>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border border-[#1b3a6b]/15 bg-white shadow-2xl">
          {/* Map header */}
          <div className="flex items-center justify-between border-b border-border bg-[#0f2044] px-5 py-3 text-white">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <MapIcon className="h-4 w-4 text-[#f0b429]" />
              District 23 — Field Plan
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/70">
              Live
            </span>
          </div>

          {/* Map body */}
          <div className="grid gap-0 md:grid-cols-[1.5fr_1fr]">
            <div className="relative bg-[#eef1f6] p-4">
              <svg viewBox="0 0 270 210" className="h-full w-full">
                {TURFS.map((turf) => (
                  <polygon
                    key={turf.id}
                    points={turf.points}
                    fill={turf.fill}
                    fillOpacity={turf.done ? 0.35 : 0.15}
                    stroke={turf.fill}
                    strokeOpacity={0.7}
                    strokeWidth={1.5}
                  />
                ))}
                {DOORS.map(([cx, cy], i) => (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={i % 3 === 0 ? "#1e6b3a" : "#1b3a6b"}
                    fillOpacity={0.85}
                  />
                ))}
              </svg>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1e6b3a]" /> Knocked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#1b3a6b]" /> Not yet
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-3 rounded-sm bg-[#c4910a]/40" /> Turf
                </span>
              </div>
            </div>

            {/* Stats panel */}
            <div className="border-t border-border p-6 md:border-l md:border-t-0">
              <p className="text-sm font-semibold text-[#1a1a2e]">Tonight&apos;s progress</p>
              <div className="mt-5 space-y-5">
                <Stat label="Turfs cut" value="4" sub="2 completed" />
                <Stat label="Doors assigned" value="312" sub="across 6 volunteers" />
                <Stat label="Knocked" value="68%" sub="212 of 312" />
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-[#f4f6f9]">
                <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-[#1e6b3a] to-[#2d9e56]" />
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Every knock updates your voter file instantly — and the same data powers your{" "}
          <Link href="/platform/voter-outreach" className="font-medium text-[#1b3a6b] underline">
            email and text outreach
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <div>
        <p className="text-sm font-medium text-[#1a1a2e]">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <p className="text-2xl font-black tracking-tight text-[#1b3a6b]">{value}</p>
    </div>
  )
}

/* ─────────────────────────── Value ─────────────────────────── */

const VALUE = [
  {
    icon: Scissors,
    stat: "Turf in minutes",
    title: "Volunteers out the door faster",
    description:
      "What used to be an hour with a map and a highlighter is a few clicks — so a volunteer who shows up at 6 is knocking by 6:15.",
  },
  {
    icon: RefreshCw,
    stat: "Zero data entry",
    title: "The night ends when canvassing ends",
    description:
      "Responses are captured at the door and synced instantly. No shoebox of sheets, no late-night typing, no lost data.",
  },
  {
    icon: Activity,
    stat: "Live coverage",
    title: "Manage the whole field at a glance",
    description:
      "See what's knocked and what's left in real time, so you can move volunteers to where they matter most.",
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
            More doors knocked, more data kept, more time saved
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
            Built for volunteers, connected to everything
          </h2>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
          <Point title="Simple enough for any volunteer">
            If they can use a phone, they can canvass. The door app is fast, obvious, and forgiving —
            even for first-timers.
          </Point>
          <Point title="One file with your outreach">
            Field and{" "}
            <Link href="/platform/voter-outreach" className="font-medium text-[#1b3a6b] underline">
              Voter Outreach
            </Link>{" "}
            share the same voter data, so a door knock informs who you text and a text informs who
            you visit.
          </Point>
          <Point title="Works at the door">
            Designed for real conditions — quick taps, big targets, and tolerance for the spotty
            signal you get on a porch.
          </Point>
          <Point title="Nothing lost in translation">
            Data goes from doorstep to database with no re-entry step where it can be delayed,
            mangled, or dropped.
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
          Run the ground game of a campaign twice your size
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
          Cut your first turf and send volunteers out with real tools. Start free — no clipboards,
          no consultants.
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
