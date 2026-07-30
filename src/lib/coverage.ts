/**
 * Single source of truth for voter-file coverage.
 *
 * Voter Outreach and Field Tools run on official state voter files; we add
 * states as we secure each file. Some states restrict access or price it
 * prohibitively (e.g. Alabama charges ~$37,000), so coverage will always be
 * selective. AI Communications and Candidate Websites do not depend on the
 * voter file and work in every state.
 *
 * Update LIVE_STATES as new states come online.
 */
export const LIVE_STATES = ["New York"] as const

export const liveStatesLabel = LIVE_STATES.join(", ")

export const COVERAGE_LINE = `Live in ${liveStatesLabel} · expanding state by state`
