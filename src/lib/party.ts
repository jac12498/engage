/**
 * A candidate's combined ballot line: the primary party plus any fusion
 * endorsements, e.g. `formatBallotLine("Democrat", ["Working Families"])`
 * → "Democrat, Working Families". Used on the public site, in AI generation
 * context, and in Settings display.
 */
export function formatBallotLine(
  party?: string | null,
  additional?: string[] | null
): string {
  return [party, ...(additional ?? [])]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ")
}
