import "server-only"
import { existsSync } from "fs"
import { prisma } from "@/lib/prisma"
import {
  getDuckDBInstance,
  getDisclosuresParquetPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"

/**
 * Donor → Contact source. Returns the individuals who contributed **to your own
 * committee**, aggregated into one row per donor, so they can be bulk-added to the
 * contact list.
 *
 * LEGAL BOUNDARY: you may not mine arbitrary donors for contacts — only people who
 * gave to *your* committee. That boundary lives in the query itself: every result is
 * hard-scoped to the committee's own recipient id (`filerId`) via the WHERE clause.
 * This must never be broadened to an unscoped donor search. (Contact → Donor lookup,
 * lib/donations.ts, is the separate, permitted "show any donations for an existing
 * contact" flow.)
 *
 * State (NY) is implemented; federal (FEC) is deferred until a federal committee
 * exists to test against — for jurisdiction "federal" we return `available:false`
 * with reason "federal-unsupported".
 */

export interface CommitteeDonorContribution {
  refKey: string // matches lib/donations.ts NY format: filer|date|last|first|amount
  amount: number | null
  donationDate: string | null // YYYY-MM-DD
  recipient: string | null
}

export interface CommitteeDonor {
  /** Stable per-donor key (normalized last|first|city|zip). */
  key: string
  firstName: string
  lastName: string
  street: string | null
  city: string | null
  state: string | null
  zip: string | null
  employer: string | null
  occupation: string | null
  totalAmount: number
  count: number
  lastDate: string | null
  contributions: CommitteeDonorContribution[]
}

export type CommitteeDonorsResult =
  | { available: true; source: "ny"; donors: CommitteeDonor[] }
  | { available: false; reason: "no-filer-id" | "federal-unsupported" | "data-missing"; donors: [] }

/** Committee fields this reader needs (subset of the Prisma Committee row). */
export interface DonorScopeCommittee {
  jurisdiction: string
  state: string | null
  filerId: string | null
}

/**
 * A donor source the active committee is allowed to import from: its own committee,
 * or one of its candidates' own committees (each hard-scoped to that filer id). The
 * legal boundary — you may only pull donors of a committee you run — is enforced by
 * building this list from the DB (the committee's filerId + its candidates' filerIds),
 * never from a client-supplied filer id.
 */
export interface DonorSource {
  key: string // "committee" | `candidate:${candidateId}`
  label: string
  scope: DonorScopeCommittee
}

/** The donor sources available to a committee: itself + any candidate with a filer id. */
export async function getDonorSources(committeeId: string): Promise<DonorSource[]> {
  const committee = await prisma.committee.findUnique({
    where: { id: committeeId },
    select: {
      name: true,
      jurisdiction: true,
      state: true,
      filerId: true,
      candidates: {
        orderBy: { createdAt: "asc" },
        select: {
          candidateName: true,
          // The candidate's committee filer id now lives on their campaign (run).
          campaigns: {
            where: { filerId: { not: null } },
            orderBy: [{ cycle: "desc" }],
            select: { id: true, filerId: true },
          },
        },
      },
    },
  })
  if (!committee) return []

  const sources: DonorSource[] = []
  if (committee.filerId) {
    sources.push({
      key: "committee",
      label: `${committee.name} (committee)`,
      scope: { jurisdiction: committee.jurisdiction, state: committee.state, filerId: committee.filerId },
    })
  }
  for (const cand of committee.candidates) {
    for (const camp of cand.campaigns) {
      sources.push({
        key: `campaign:${camp.id}`,
        label: `${cand.candidateName}’s committee`,
        scope: { jurisdiction: committee.jurisdiction, state: committee.state, filerId: camp.filerId },
      })
    }
  }
  return sources
}

const s = (v: unknown): string | null => {
  if (v == null) return null
  const t = String(v).trim()
  return t.length ? t : null
}
const num = (v: unknown): number | null => {
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Cap the scan defensively; a single committee's individual contributions are bounded
// (hundreds–low thousands), so this only guards against a pathological filer id.
const MAX_ROWS = 50000

/**
 * Individuals who contributed to `committee`, aggregated per donor. Scoped to the
 * committee's own recipient id — see the LEGAL BOUNDARY note above.
 */
export async function getCommitteeDonors(committee: DonorScopeCommittee): Promise<CommitteeDonorsResult> {
  const filerId = committee.filerId?.trim()
  if (!filerId) return { available: false, reason: "no-filer-id", donors: [] }

  // Federal import is deferred (no federal committee to test against yet).
  if (committee.jurisdiction === "federal") {
    return { available: false, reason: "federal-unsupported", donors: [] }
  }

  // State (NY today): schedule-A monetary contributions received by our filer id,
  // limited to individuals (a contributor last name is present — org contributions
  // carry only the organization name).
  const state = (committee.state ?? "ny").toLowerCase()
  const p = getDisclosuresParquetPath(state)
  if (!existsSync(p)) return { available: false, reason: "data-missing", donors: [] }
  const rel = `read_parquet(${sqlString(toSqlPath(p))})`

  const where = [
    `TRIM(column00,'"') = ${sqlString(filerId)}`, // ← the legal scope: our committee only
    `TRIM(column10,'"') = 'A'`,
    `NULLIF(TRIM(column27,'"'), '') IS NOT NULL`,
  ]

  const sql =
    `SELECT ` +
    `TRIM(column00,'"') || '|' || LEFT(TRIM(column15,'"'),10) || '|' || TRIM(column27,'"') || '|' || TRIM(column25,'"') || '|' || TRIM(column36,'"') AS "refKey", ` +
    `TRIM(column25,'"') AS "firstName", TRIM(column27,'"') AS "lastName", ` +
    `TRIM(column28,'"') AS street, TRIM(column29,'"') AS city, TRIM(column30,'"') AS state, TRIM(column31,'"') AS zip, ` +
    `TRIM(column52,'"') AS employer, TRIM(column53,'"') AS occupation, ` +
    `NULLIF(TRIM(column02,'"'), '') AS recipient, ` +
    `TRY_CAST(TRIM(column36,'"') AS DOUBLE) AS amount, ` +
    `LEFT(TRIM(column15,'"'),10) AS "donationDate" ` +
    `FROM ${rel} WHERE ${where.join(" AND ")} LIMIT ${MAX_ROWS}`

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  let rows: Record<string, unknown>[]
  try {
    rows = (await conn.runAndReadAll(sql)).getRowObjects() as Record<string, unknown>[]
  } finally {
    conn.closeSync()
  }

  // Aggregate per donor (normalized last|first|city|zip).
  const byKey = new Map<string, CommitteeDonor>()
  for (const r of rows) {
    const firstName = s(r.firstName) ?? ""
    const lastName = s(r.lastName) ?? ""
    const city = s(r.city)
    const zip = s(r.zip)
    const key = [lastName, firstName, city ?? "", zip ?? ""].map((x) => x.toUpperCase()).join("|")
    const amount = num(r.amount)
    const donationDate = s(r.donationDate)

    let donor = byKey.get(key)
    if (!donor) {
      donor = {
        key,
        firstName,
        lastName,
        street: s(r.street),
        city,
        state: s(r.state),
        zip,
        employer: s(r.employer),
        occupation: s(r.occupation),
        totalAmount: 0,
        count: 0,
        lastDate: null,
        contributions: [],
      }
      byKey.set(key, donor)
    }
    donor.totalAmount += amount ?? 0
    donor.count += 1
    if (donationDate && (!donor.lastDate || donationDate > donor.lastDate)) donor.lastDate = donationDate
    // Fill representative details from any row that has them.
    donor.street ??= s(r.street)
    donor.employer ??= s(r.employer)
    donor.occupation ??= s(r.occupation)
    donor.contributions.push({
      refKey: String(r.refKey ?? ""),
      amount,
      donationDate,
      recipient: s(r.recipient),
    })
  }

  const donors = [...byKey.values()].sort((a, b) => b.totalAmount - a.totalAmount)
  return { available: true, source: "ny", donors }
}
