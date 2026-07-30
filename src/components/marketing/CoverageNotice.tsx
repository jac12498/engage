import { COVERAGE_LINE } from "@/lib/coverage"

/**
 * A small "live coverage" pill for voter-file-dependent pages.
 * `dark` for use on the navy hero; `light` for light sections.
 */
export function CoverageBadge({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const toneClass =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white/80"
      : "border-[#c4910a]/30 bg-[#fdf8ee] text-[#1a1a2e]"
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${toneClass}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#2d9e56]" />
      {COVERAGE_LINE}
    </span>
  )
}
