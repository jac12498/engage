import "server-only"
import { existsSync } from "fs"
import {
  getDuckDBInstance,
  getVotersParquetPath,
  getVotingHistoryParquetPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"

/**
 * Read-side helpers for the voter file (voters.parquet + voting_history.parquet),
 * powering the "Find & link voter record" flow on a Contact. Queries scan the
 * parquet on demand (fine for a modal). Everything degrades gracefully when the
 * parquet isn't present (prod before the Railway volume) — searches return [] and
 * lookups return null rather than throwing.
 */

export interface VoterCandidate {
  stateVoterId: string
  firstName: string | null
  lastName: string | null
  middleName: string | null
  address: string | null
  city: string | null
  zip: string | null
  party: string | null
  partyLabel: string | null
  county: string | null
  countyLabel: string | null
  status: string | null
  statusLabel: string | null
}

export interface VoterRecord extends VoterCandidate {
  gender: string | null
  dob: string | null
  registrationDate: string | null
  districtCd: string | null
  districtSd: string | null
  districtAd: string | null
  districtEd: string | null
}

export interface VotingHistory {
  count: number
  lastYear: number | null
  elections: {
    electionCode: string
    electionYear: number | null
    electionTypeHint: string | null
    voteMethod: string | null
    isStandardized: boolean
  }[]
}

const s = (v: unknown): string | null => {
  if (v == null) return null
  const t = String(v).trim()
  return t.length ? t : null
}

const PARTY_LABELS: Record<string, string> = {
  DEM: "Democratic",
  REP: "Republican",
  CON: "Conservative",
  WOR: "Working Families",
  GRE: "Green",
  LBT: "Libertarian",
  IND: "Independence",
  BLK: "Blank / No Party",
  OTH: "Other",
}
const STATUS_LABELS: Record<string, string> = {
  A: "Active",
  AM: "Active (Military)",
  AF: "Active (Special Federal)",
  AP: "Active (Special Presidential)",
  AU: "Active (UOCAVA)",
  I: "Inactive",
  P: "Purged",
  "17": "Pre-registered (17)",
}
// BOE 2-digit county codes → names.
const COUNTY_LABELS: Record<string, string> = {
  "01": "Albany", "02": "Allegany", "03": "Bronx", "04": "Broome", "05": "Cattaraugus",
  "06": "Cayuga", "07": "Chautauqua", "08": "Chemung", "09": "Chenango", "10": "Clinton",
  "11": "Columbia", "12": "Cortland", "13": "Delaware", "14": "Dutchess", "15": "Erie",
  "16": "Essex", "17": "Franklin", "18": "Fulton", "19": "Genesee", "20": "Greene",
  "21": "Hamilton", "22": "Herkimer", "23": "Jefferson", "24": "Kings (Brooklyn)", "25": "Lewis",
  "26": "Livingston", "27": "Madison", "28": "Monroe", "29": "Montgomery", "30": "Nassau",
  "31": "New York (Manhattan)", "32": "Niagara", "33": "Oneida", "34": "Onondaga", "35": "Ontario",
  "36": "Orange", "37": "Orleans", "38": "Oswego", "39": "Otsego", "40": "Putnam",
  "41": "Queens", "42": "Rensselaer", "43": "Richmond (Staten Island)", "44": "Rockland", "45": "Saratoga",
  "46": "Schenectady", "47": "Schoharie", "48": "Schuyler", "49": "Seneca", "50": "St. Lawrence",
  "51": "Steuben", "52": "Suffolk", "53": "Sullivan", "54": "Tioga", "55": "Tompkins",
  "56": "Ulster", "57": "Warren", "58": "Washington", "59": "Wayne", "60": "Westchester",
  "61": "Wyoming", "62": "Yates",
}

const label = (map: Record<string, string>, code: string | null) => (code ? map[code] ?? code : null)

function votersRelation(state: string): string | null {
  const p = getVotersParquetPath(state)
  return existsSync(p) ? `read_parquet(${sqlString(toSqlPath(p))})` : null
}

/** Is the voter file available for this state right now? */
export function voterFileAvailable(state: string): boolean {
  return existsSync(getVotersParquetPath(state))
}

const SELECT_CANDIDATE =
  `state_voter_id AS "stateVoterId", first_name AS "firstName", last_name AS "lastName", middle_name AS "middleName", ` +
  `NULLIF(TRIM(COALESCE(residence_address_number,'') || ' ' || COALESCE(residence_street,'')), '') AS address, ` +
  `residence_city AS city, residence_zip5 AS zip, registration_party AS party, county_code AS county, registration_status AS status`

function toCandidate(r: Record<string, unknown>): VoterCandidate {
  const party = s(r.party)
  const county = s(r.county)
  const status = s(r.status)
  return {
    stateVoterId: String(r.stateVoterId ?? ""),
    firstName: s(r.firstName),
    lastName: s(r.lastName),
    middleName: s(r.middleName),
    address: s(r.address),
    city: s(r.city),
    zip: s(r.zip),
    party,
    partyLabel: label(PARTY_LABELS, party),
    county,
    countyLabel: label(COUNTY_LABELS, county),
    status,
    statusLabel: label(STATUS_LABELS, status),
  }
}

/** Candidate voters for the link modal. `lastName` is required; the rest narrow. */
export async function searchVoters(
  state: string,
  filters: { lastName: string; firstName?: string; city?: string; zip?: string },
  limit = 50,
): Promise<VoterCandidate[]> {
  const lastName = filters.lastName?.trim()
  if (!lastName) return []
  const rel = votersRelation(state)
  if (!rel) return []

  const where: string[] = [`UPPER(last_name) = UPPER(${sqlString(lastName)})`]
  const first = filters.firstName?.trim()
  if (first) where.push(`UPPER(first_name) LIKE UPPER(${sqlString(first + "%")})`)
  const city = filters.city?.trim()
  if (city) where.push(`UPPER(residence_city) = UPPER(${sqlString(city)})`)
  const zip = filters.zip?.trim().replace(/\D/g, "")
  if (zip) where.push(`LEFT(residence_zip5, ${zip.length}) = ${sqlString(zip)}`)

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `SELECT ${SELECT_CANDIDATE} FROM ${rel} WHERE ${where.join(" AND ")} ` +
          `ORDER BY residence_city, first_name LIMIT ${Math.max(1, Math.min(200, limit))}`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    return rows.map(toCandidate)
  } finally {
    conn.closeSync()
  }
}

/** The full voter record for a linked contact, or null if not found / unavailable. */
export async function getVoterById(state: string, stateVoterId: string): Promise<VoterRecord | null> {
  const id = stateVoterId?.trim()
  if (!id) return null
  const rel = votersRelation(state)
  if (!rel) return null

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `SELECT ${SELECT_CANDIDATE}, gender, CAST(dob AS VARCHAR) AS dob, CAST(registration_date AS VARCHAR) AS "registrationDate", ` +
          `district_cd AS "districtCd", district_sd AS "districtSd", district_ad AS "districtAd", district_ed AS "districtEd" ` +
          `FROM ${rel} WHERE state_voter_id = ${sqlString(id)} LIMIT 1`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      ...toCandidate(r),
      gender: s(r.gender),
      dob: s(r.dob),
      registrationDate: s(r.registrationDate),
      districtCd: s(r.districtCd),
      districtSd: s(r.districtSd),
      districtAd: s(r.districtAd),
      districtEd: s(r.districtEd),
    }
  } finally {
    conn.closeSync()
  }
}

/** A linked voter's participation history (most recent first). */
export async function getVotingHistory(state: string, stateVoterId: string): Promise<VotingHistory> {
  const empty: VotingHistory = { count: 0, lastYear: null, elections: [] }
  const id = stateVoterId?.trim()
  if (!id) return empty
  const p = getVotingHistoryParquetPath(state)
  if (!existsSync(p)) return empty

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `SELECT election_code AS "electionCode", election_year AS "electionYear", election_type_hint AS "electionTypeHint", ` +
          `vote_method AS "voteMethod", is_standardized AS "isStandardized" ` +
          `FROM read_parquet(${sqlString(toSqlPath(p))}) WHERE state_voter_id = ${sqlString(id)} ` +
          `ORDER BY election_year DESC NULLS LAST, election_code`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    const elections = rows.map((r) => ({
      electionCode: String(r.electionCode ?? ""),
      electionYear: r.electionYear == null ? null : Number(r.electionYear),
      electionTypeHint: s(r.electionTypeHint),
      voteMethod: s(r.voteMethod),
      isStandardized: Boolean(r.isStandardized),
    }))
    const lastYear = elections.find((e) => e.electionYear != null)?.electionYear ?? null
    return { count: elections.length, lastYear, elections }
  } finally {
    conn.closeSync()
  }
}
