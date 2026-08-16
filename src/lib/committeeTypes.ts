/**
 * State-specific political committee types, used by committee-first onboarding.
 *
 * A committee registers under its state's rules, and each state recognizes a
 * different set of committee types. Keyed by 2-letter state so more states drop in
 * later. NY only for now (federal/other states deferred).
 *
 * NY types map to the NY State Board of Elections CF-02 registration "Type"
 * numbers (https://elections.ny.gov/committee-information). The `code` is our
 * stable internal value stored on Committee.committeeType; the label/description
 * are what onboarding shows.
 */

export interface CommitteeType {
  code: string
  label: string
  description: string
}

export interface StateOption {
  code: string
  name: string
}

/** States we support today. Others are shown but disabled ("coming soon"). */
export const SUPPORTED_STATES: StateOption[] = [{ code: "NY", name: "New York" }]

export const COMMITTEE_TYPES_BY_STATE: Record<string, CommitteeType[]> = {
  NY: [
    {
      code: "authorized_single",
      label: "Authorized Single-Candidate Committee",
      description:
        "Supports one candidate — e.g. “Friends of Jane Smith.” The most common type (NYSBOE CF-02 Type 1).",
    },
    {
      code: "authorized_multi",
      label: "Authorized Multi-Candidate Committee",
      description: "Authorized to support multiple candidates (NYSBOE CF-02 Type 9).",
    },
    {
      code: "constituted",
      label: "Constituted / Party Committee",
      description:
        "A state, county, or town party committee — e.g. “Woodstock Democratic Committee” (NYSBOE CF-02 Types 3–7).",
    },
    {
      code: "pac",
      label: "Political Action Committee (PAC)",
      description:
        "Makes contributions to candidates and committees, but no independent expenditures (NYSBOE CF-02 Type 2).",
    },
    {
      code: "independent_expenditure",
      label: "Independent Expenditure Committee",
      description:
        "Only makes independent expenditures; does not coordinate with any candidate (NYSBOE CF-02 Type 8).",
    },
    {
      code: "ballot_issue",
      label: "Ballot Issue Committee",
      description: "Supports or opposes a ballot proposal (NYSBOE CF-02 Type 9B).",
    },
    {
      code: "housekeeping",
      label: "Housekeeping Committee",
      description:
        "Party/constituted committees only — a segregated account for non-campaign operating expenses (NYSBOE CF-02 Types 3H–7H).",
    },
  ],
}

/** Committee types available for a state (empty if the state isn't supported). */
export function committeeTypesFor(state: string | null | undefined): CommitteeType[] {
  if (!state) return []
  return COMMITTEE_TYPES_BY_STATE[state.toUpperCase()] ?? []
}

/** True when we support committee registration for this state. */
export function isSupportedState(state: string | null | undefined): boolean {
  return committeeTypesFor(state).length > 0
}

/** Human label for a stored committee-type code within a state. */
export function committeeTypeLabel(
  state: string | null | undefined,
  code: string | null | undefined
): string | null {
  if (!code) return null
  const t = committeeTypesFor(state).find((x) => x.code === code)
  return t?.label ?? null
}

/** Validate a (state, type) pair for server-side writes. */
export function isValidCommitteeType(
  state: string | null | undefined,
  code: string | null | undefined
): boolean {
  return !!code && committeeTypesFor(state).some((x) => x.code === code)
}
