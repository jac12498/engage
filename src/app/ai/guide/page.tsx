import Link from "next/link"
import { ArrowRight, Check, X } from "lucide-react"

export const metadata = { title: "Writing guide · AI Assistant" }

const STEPS = [
  {
    n: 1,
    title: "Teach it who you are",
    body: (
      <>
        Every draft is grounded in what the tool knows about you. Before you generate anything, fill out
        the{" "}
        <Link href="/settings/voice" className="font-medium text-[#c4910a] hover:underline">
          Interview
        </Link>{" "}
        — your background, why you&apos;re running, your core values, and the tone you want to sound like.
        The more complete your profile, the more each draft reads like <em>you</em> and less like a generic
        politician. This is the single biggest lever on quality.
      </>
    ),
  },
  {
    n: 2,
    title: "Give it material to work with",
    body: (
      <>
        Add your issue positions and reference material on the{" "}
        <Link href="/settings/context" className="font-medium text-[#c4910a] hover:underline">
          Context
        </Link>{" "}
        page, and set up recurring subjects on the{" "}
        <Link href="/settings/topics" className="font-medium text-[#c4910a] hover:underline">
          Topics
        </Link>{" "}
        page (each with a key message and priority talking points). When you generate on a topic, that
        material is folded in automatically — so the draft argues <em>your</em> positions with real facts,
        not invented ones.
      </>
    ),
  },
  {
    n: 3,
    title: "Write a specific brief",
    body: (
      <>
        The <span className="font-medium text-[#1a1a2e]">Your Message</span> box is where you tell the
        tool what <em>this</em> particular piece should do. Specificity is everything — name the occasion,
        the audience, the one thing you want them to remember, and any details that must appear. A vague
        brief gets a vague draft.
      </>
    ),
  },
  {
    n: 4,
    title: "Generate, then refine — don't settle for the first draft",
    body: (
      <>
        The first draft is a starting point, not the finish line. Edit the text directly, or use{" "}
        <span className="font-medium text-[#1a1a2e]">comments</span> to point at a passage and say what to
        change. Every time you revise, the tool rewrites <em>your current draft</em> per your notes — it
        never re-rolls from scratch — so your edits compound. Each version is saved, so you can always step
        back. Revising is nearly free: only every fifth revision costs a credit.
      </>
    ),
  },
  {
    n: 5,
    title: "Match the model to the moment",
    body: (
      <>
        Draft and explore quickly on Haiku, then regenerate the pieces that matter on a stronger model.
        See the{" "}
        <Link href="/ai/models" className="font-medium text-[#c4910a] hover:underline">
          model comparison
        </Link>{" "}
        for the same speech written by each — and what you get for the extra credits.
      </>
    ),
  },
]

export default function WritingGuidePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Getting the most out of AI-assisted writing</h1>
        <p className="mt-1 text-muted-foreground">
          Think of this as a fast, tireless first-draft partner that writes in your voice — not a
          replacement for your judgment. The best results come from a short back-and-forth, not a single
          click.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-4 rounded-2xl border border-border bg-white p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b3a6b] text-sm font-bold text-white">
              {s.n}
            </div>
            <div>
              <h2 className="font-semibold text-[#1a1a2e]">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Weak vs strong brief */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          A vague brief vs. a strong one
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">
              <X className="h-3.5 w-3.5" /> Too vague
            </p>
            <p className="mt-2 text-sm italic leading-relaxed text-[#1a1a2e]">
              “Write a speech about the Fourth of July.”
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              The tool has to guess the length, audience, occasion, and point — so it defaults to generic.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              <Check className="h-3.5 w-3.5" /> Specific
            </p>
            <p className="mt-2 text-sm italic leading-relaxed text-[#1a1a2e]">
              “A 2–3 minute speech at a 4th of July event for the nation&apos;s 250th anniversary. Focus on
              the experiment in democracy we&apos;re part of and how to keep making it better.”
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Occasion, length, audience, and the core idea are all clear — so the draft arrives close to
              what you actually need.
            </p>
          </div>
        </div>
      </div>

      {/* Always make it yours */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-[#1a1a2e]">Before you send it: make it yours</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-[#1a1a2e]">Add the local specifics.</span> Names, the street
            everyone knows, the vote last month — the details only you can supply are what make it land.
          </li>
          <li>
            <span className="font-medium text-[#1a1a2e]">Check every fact and figure.</span> AI can sound
            confident and still be wrong. Verify names, dates, and numbers before anything goes public.
          </li>
          <li>
            <span className="font-medium text-[#1a1a2e]">Read it aloud.</span> Especially for speeches —
            your ear will catch what your eye skips, and you&apos;ll trim to your natural rhythm.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/ai/models"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1b3a6b]/90"
        >
          Compare the models <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/settings/voice"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-[#1a1a2e] transition-colors hover:border-[#1b3a6b]/40"
        >
          Start with the interview
        </Link>
      </div>
    </div>
  )
}
