import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { ModelComparisonExplorer } from "@/components/communications/ModelComparisonExplorer"
import { MODELS } from "./samples"

export const metadata = { title: "Choosing a model · AI Communications" }

export default async function ModelComparisonPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>
}) {
  const { format } = await searchParams
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Choosing a model</h1>
        <p className="mt-1 text-muted-foreground">
          Every draft is written by one of three AI models. Stronger models write with more nuance and
          depth — and cost more Model Credits. Pick a format below to see the same prompt written by each,
          and judge the difference yourself.
        </p>
      </div>

      {/* How credits work */}
      <div className="rounded-2xl border border-[#c4910a]/25 bg-[#f0b429]/[0.06] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1a1a2e]">
          <Sparkles className="h-4 w-4 text-[#c4910a]" /> How Model Credits work
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Each plan includes a monthly pool of Model Credits. A generation spends credits based on the
          model you pick — so you can stretch your pool across many quick Haiku drafts, or spend it on a
          few polished Opus pieces. You choose per draft. Revising a draft is nearly free: only every
          fifth revision costs credits.
        </p>
      </div>

      {/* Model cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {MODELS.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a2e]">{m.name}</h3>
              <span className="rounded-full bg-[#1b3a6b]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1b3a6b]">
                {m.credits} credit{m.credits > 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{m.bestFor}</p>
          </div>
        ))}
      </div>

      {/* Format-switchable, side-by-side samples */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          See the difference
        </h2>
        <ModelComparisonExplorer initialFormat={format} />
      </div>

      {/* What to notice */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <h2 className="font-semibold text-[#1a1a2e]">What to notice</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>
            <span className="font-medium text-[#1a1a2e]">Haiku</span> is clear, warm, and fast — it nails
            the core idea in the fewest words. Great for a quick draft you&apos;ll shape yourself.
          </li>
          <li>
            <span className="font-medium text-[#1a1a2e]">Sonnet</span> adds craft: sharper structure, a
            more distinctive voice, and smoother transitions.
          </li>
          <li>
            <span className="font-medium text-[#1a1a2e]">Opus</span> goes furthest — it reckons with
            nuance, builds a real arc, and often fills in concrete, usable specifics where lighter models
            leave placeholders. The pick when the moment matters.
          </li>
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          A good habit: draft and explore on Haiku, then regenerate your finalists on Opus. New to the
          workflow?{" "}
          <Link
            href="/communications/guide"
            className="inline-flex items-center gap-1 font-medium text-[#c4910a] hover:underline"
          >
            Read the writing guide <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>
      </div>
    </div>
  )
}
