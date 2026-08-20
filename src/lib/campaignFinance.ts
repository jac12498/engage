import "server-only"
import { stat } from "fs/promises"
import {
  getDuckDBInstance,
  getCommitteeRegistryParquetPath,
  getCommitteeRegistryCsvPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"

/**
 * NY campaign-finance committee registry (NYSBOE COMMCAND), read from parquet via
 * DuckDB. The NYSBOE Filer ID is the committee_id (column00). Used to look up a
 * committee during onboarding and prefill its details.
 *
 * Ported from engage.democrat (version10.3) lib/campaignFinanceHelpers.ts, trimmed
 * to just the by-Filer-ID lookup. The registry parquet stores values wrapped in
 * double-quotes, so every field is TRIM(col, '"')'d.
 */

// COMMCAND headerless column positions → fields (parquet columns are column00..column16).
export const NY_COMMITTEE_COLUMNS = {
  committeeId: 0,
  committeeName: 1,
  filerType: 2,
  filingLevel: 3,
  status: 4,
  committeeType: 5,
  office: 6, // candidate rows: office sought; empty for committees
  district: 7, // candidate rows: district number; empty for committees
  county: 8,
  municipality: 9,
  treasurerFirstName: 10,
  treasurerMiddleName: 11,
  treasurerLastName: 12,
  addressLine1: 13,
  city: 14,
  addressState: 15,
  zip: 16,
} as const

// NYSBOE disclosure (contribution) headerless column positions → fields. 54 columns
// (column00..column53); only the mapped ones are listed (the rest are unused/unknown).
// This is the code-side source of truth the contact↔donation matching uses; the human
// reference lives in data/campaign_finance/ny/disclosures/schema.json. Contributions
// (money given) are schedule "A" (see scheduleCode); filter on that when matching.
export const NY_DISCLOSURE_COLUMNS = {
  filerId: 0, // committee/filer id — joins to committees.column00
  committeeName: 2,
  electionYear: 3,
  electionType: 4,
  disclosurePeriod: 6, // A–M period code
  filingCategory: 9, // Itemized | No Activity
  scheduleCode: 10, // "A" = Monetary Contributions/Receipts (the donations)
  scheduleDesc: 11,
  contributionDate: 15,
  contributorType: 17, // Individual | Political Committee | ...
  organizationName: 24, // set when the contributor is an org; else use 25–27
  donorFirstName: 25,
  donorMiddleName: 26,
  donorLastName: 27,
  street: 28,
  city: 29,
  state: 30,
  zip: 31,
  amount: 36, // stored as text in the parquet — CAST(... AS DOUBLE) to sum
  employer: 52,
  occupation: 53,
} as const

export type CampaignFinanceCommittee = {
  routeId: string
  state: string
  committeeId: string
  committeeName: string
  filerType: string | null
  filingLevel: string | null
  status: string | null
  committeeType: string | null
  office: string | null
  district: string | null
  county: string | null
  municipality: string | null
  treasurerName: string | null
  addressLine1: string | null
  city: string | null
  addressState: string | null
  zip: string | null
}

const clean = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

async function fileExists(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile()
  } catch {
    return false
  }
}

/**
 * A DuckDB relation for a state's committee registry — the committed parquet when
 * present, else the raw COMMCAND.CSV (dev fallback). Both yield column00..column16.
 */
async function committeeRegistryRelation(state: string): Promise<string | null> {
  const parquet = getCommitteeRegistryParquetPath(state)
  if (await fileExists(parquet)) {
    return `read_parquet(${sqlString(toSqlPath(parquet))})`
  }
  const csv = getCommitteeRegistryCsvPath(state)
  if (await fileExists(csv)) {
    return `read_csv_auto(${sqlString(
      toSqlPath(csv)
    )}, header=false, all_varchar=true, sample_size=-1, ignore_errors=true)`
  }
  return null
}

// SELECT list of every needed column, quotes trimmed, stably aliased. `name` etc.
// are avoided; aliases are safe identifiers.
const SELECT_ALIASES: [alias: string, index: number][] = [
  ["committeeName", 1],
  ["filerType", 2],
  ["filingLevel", 3],
  ["status", 4],
  ["committeeType", 5],
  ["office", 6],
  ["district", 7],
  ["county", 8],
  ["municipality", 9],
  ["treasurerFirst", 10],
  ["treasurerMiddle", 11],
  ["treasurerLast", 12],
  ["addressLine1", 13],
  ["city", 14],
  ["addressState", 15],
  ["zip", 16],
]
const SELECT_COLUMNS = SELECT_ALIASES.map(
  ([alias, i]) => `TRIM(column${String(i).padStart(2, "0")}, '"') AS ${alias}`
).join(", ")

/**
 * Look up a committee by its NYSBOE Filer ID (= committee_id, column00). Returns
 * null when the state is unsupported, the registry file is missing, or no row
 * matches. Only NY is supported today.
 */
export async function fetchCommitteeByFilerId(
  state: string,
  filerId: string
): Promise<CampaignFinanceCommittee | null> {
  const stateCode = state.toLowerCase()
  const id = filerId.trim()
  if (!id) return null

  const relation = await committeeRegistryRelation(stateCode)
  if (!relation) return null

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const sql = `SELECT ${SELECT_COLUMNS} FROM ${relation} WHERE TRIM(column00, '"') = ${sqlString(
      id
    )} LIMIT 1`
    const result = await conn.runAndReadAll(sql)
    const rows = result.getRowObjects()
    if (rows.length === 0) return null
    const r = rows[0] as Record<string, unknown>

    const treasurerName =
      [clean(r.treasurerFirst), clean(r.treasurerMiddle), clean(r.treasurerLast)]
        .filter(Boolean)
        .join(" ") || null

    return {
      routeId: `${stateCode}-${id}`,
      state: stateCode,
      committeeId: id,
      committeeName: clean(r.committeeName) ?? "Unknown Committee",
      filerType: clean(r.filerType),
      filingLevel: clean(r.filingLevel),
      status: clean(r.status),
      committeeType: clean(r.committeeType),
      office: clean(r.office),
      district: clean(r.district),
      county: clean(r.county),
      municipality: clean(r.municipality),
      treasurerName,
      addressLine1: clean(r.addressLine1),
      city: clean(r.city),
      addressState: clean(r.addressState),
      zip: clean(r.zip),
    }
  } finally {
    conn.closeSync()
  }
}

export type CampaignFinanceCommitteeMatch = {
  committeeId: string
  committeeName: string
  committeeType: string | null // raw NYSBOE label
  filerType: string | null
  status: string | null
  city: string | null
  addressState: string | null
}

/**
 * Search the committee registry by name (for people who don't know their Filer ID).
 * Case-insensitive substring match on the committee name; ACTIVE committees first,
 * then by name. Returns [] when the state is unsupported, the file is missing, or the
 * query is too short. Only NY is supported today.
 */
export async function searchCommitteesByName(
  state: string,
  query: string,
  limit = 25
): Promise<CampaignFinanceCommitteeMatch[]> {
  const stateCode = state.toLowerCase()
  const q = query.trim()
  if (q.length < 3) return []

  const relation = await committeeRegistryRelation(stateCode)
  if (!relation) return []

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const sql =
      `SELECT TRIM(column00,'"') AS committeeId, TRIM(column01,'"') AS committeeName, ` +
      `TRIM(column02,'"') AS filerType, TRIM(column04,'"') AS status, TRIM(column05,'"') AS committeeType, ` +
      `TRIM(column14,'"') AS city, TRIM(column15,'"') AS addressState ` +
      `FROM ${relation} ` +
      `WHERE UPPER(TRIM(column01,'"')) LIKE UPPER(${sqlString("%" + q + "%")}) ` +
      `AND NULLIF(TRIM(column00,'"'), '') IS NOT NULL ` +
      `ORDER BY (UPPER(TRIM(column04,'"')) = 'ACTIVE') DESC, committeeName LIMIT ${limit}`
    const rows = (await conn.runAndReadAll(sql)).getRowObjects() as Record<string, unknown>[]
    return rows.map((r) => ({
      committeeId: clean(r.committeeId) ?? "",
      committeeName: clean(r.committeeName) ?? "Unknown Committee",
      committeeType: clean(r.committeeType),
      filerType: clean(r.filerType),
      status: clean(r.status),
      city: clean(r.city),
      addressState: clean(r.addressState),
    }))
  } finally {
    conn.closeSync()
  }
}
