import {
  isSupportedState,
  isValidCommitteeType,
  normalizeFecCommitteeId,
  type Jurisdiction,
} from "@/lib/committeeTypes"

/** The committee registration profile a form submits (name is validated separately). */
export interface CommitteeProfileInput {
  /** Which body the committee registers under. Defaults to "state". */
  jurisdiction?: Jurisdiction
  /** 2-letter state whose committee rules apply (state committees; NY supported today). */
  state: string
  /** Committee-type code from the state's list (state committees; see lib/committeeTypes). */
  committeeType: string
  /** Recipient filer ID: a state BOE Filer ID (state) or FEC committee id "C00…" (federal). */
  filerId?: string
}

export interface CommitteeProfileData {
  jurisdiction: Jurisdiction
  state: string | null
  committeeType: string | null
  filerId: string | null
}

/** A committee registration profile plus its name — the shape create/update actions take. */
export interface CreateCommitteeInput extends CommitteeProfileInput {
  /** Committee name, e.g. "Woodstock Democratic Committee". */
  name: string
}

/**
 * Validate + normalize the committee registration profile, shared by first-time and
 * additional-committee creation. State committees carry a state + committee type + an
 * optional BOE filer id; federal committees carry an FEC committee id and leave
 * state/type null.
 */
export function buildCommitteeProfile(
  input: CommitteeProfileInput,
): { ok: true; data: CommitteeProfileData } | { ok: false; error: string } {
  const jurisdiction: Jurisdiction =
    input.jurisdiction === "federal" ? "federal" : input.jurisdiction === "none" ? "none" : "state"

  if (jurisdiction === "federal") {
    const filerId = normalizeFecCommitteeId(input.filerId)
    if (!filerId) {
      return { ok: false, error: "Enter a valid FEC committee ID (the letter C followed by 8 digits)." }
    }
    return { ok: true, data: { jurisdiction, state: null, committeeType: null, filerId } }
  }

  // Not registered with any body yet: no filer id. State + type are optional context
  // (they still drive coverage + candidate cardinality); keep a type only if it's a
  // real one for the chosen state.
  if (jurisdiction === "none") {
    const state = input.state?.trim().toUpperCase() || null
    const rawType = input.committeeType?.trim() || null
    const committeeType = rawType && state && isValidCommitteeType(state, rawType) ? rawType : null
    return { ok: true, data: { jurisdiction, state, committeeType, filerId: null } }
  }

  const state = input.state.trim().toUpperCase()
  const committeeType = input.committeeType.trim()
  if (!isSupportedState(state)) return { ok: false, error: "Please choose a supported state." }
  if (!isValidCommitteeType(state, committeeType)) {
    return { ok: false, error: "Please choose a committee type." }
  }
  return { ok: true, data: { jurisdiction, state, committeeType, filerId: input.filerId?.trim() || null } }
}
