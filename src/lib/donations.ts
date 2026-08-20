import "server-only"
import { existsSync, readdirSync } from "fs"
import {
  getDuckDBInstance,
  getDisclosuresParquetPath,
  getFecDir,
  getFecIndivParquetPath,
  getFecCommitteesParquetPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"

/**
 * Read-side helpers for donation matching — candidate contributions for a contact
 * from NY state disclosures (data.parquet, schedule "A" monetary contributions) and
 * federal FEC (indiv_*.parquet joined to committees). Powers the "Find donations"
 * review flow. Degrades gracefully when a parquet is absent (returns []).
 */

export type DonationSource = "ny" | "fec"

export interface DonationCandidate {
  source: DonationSource
  refKey: string // dedup key: fec = "cycle:tranId"; ny = "filer|date|last|first|amount"
  donorName: string | null
  recipient: string | null
  amount: number | null
  donationDate: string | null // YYYY-MM-DD
  cycle: number | null
  city: string | null
  state: string | null
  employer: string | null
  occupation: string | null
}

export interface DonationFilters {
  lastName: string
  firstName?: string
  city?: string
  state?: string
  zip?: string
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

function fecCycles(): number[] {
  try {
    return readdirSync(getFecDir())
      .map((f) => /^indiv_(\d{4})\.parquet$/.exec(f)?.[1])
      .filter((x): x is string => Boolean(x))
      .map(Number)
      .sort((a, b) => b - a)
  } catch {
    return []
  }
}

/** True when at least one donation source parquet is present. */
export function donationsSearchable(): boolean {
  return existsSync(getDisclosuresParquetPath("ny")) || fecCycles().length > 0
}

function toCandidate(r: Record<string, unknown>, source: DonationSource): DonationCandidate {
  return {
    source,
    refKey: String(r.refKey ?? ""),
    donorName: s(r.donorName),
    recipient: s(r.recipient),
    amount: num(r.amount),
    donationDate: s(r.donationDate),
    cycle: r.cycle == null ? null : Number(r.cycle),
    city: s(r.city),
    state: s(r.state),
    employer: s(r.employer),
    occupation: s(r.occupation),
  }
}

/** NY state contributions (schedule A) for a donor. Values are quote-wrapped → TRIM. */
export async function searchNYDonations(f: DonationFilters, limit = 25): Promise<DonationCandidate[]> {
  const lastName = f.lastName?.trim()
  if (!lastName) return []
  const p = getDisclosuresParquetPath("ny")
  if (!existsSync(p)) return []
  const rel = `read_parquet(${sqlString(toSqlPath(p))})`

  const where = [`TRIM(column10,'"') = 'A'`, `UPPER(TRIM(column27,'"')) = UPPER(${sqlString(lastName)})`]
  const first = f.firstName?.trim()
  if (first) where.push(`UPPER(TRIM(column25,'"')) LIKE UPPER(${sqlString(first + "%")})`)
  const city = f.city?.trim()
  if (city) where.push(`UPPER(TRIM(column29,'"')) = UPPER(${sqlString(city)})`)
  const zip = f.zip?.trim().replace(/\D/g, "")
  if (zip) where.push(`LEFT(TRIM(column31,'"'), ${zip.length}) = ${sqlString(zip)}`)

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `SELECT ` +
          `TRIM(column00,'"') || '|' || LEFT(TRIM(column15,'"'),10) || '|' || TRIM(column27,'"') || '|' || TRIM(column25,'"') || '|' || TRIM(column36,'"') AS "refKey", ` +
          `NULLIF(TRIM(TRIM(column25,'"') || ' ' || TRIM(column27,'"')), '') AS "donorName", ` +
          `NULLIF(TRIM(column02,'"'), '') AS recipient, ` +
          `TRY_CAST(TRIM(column36,'"') AS DOUBLE) AS amount, ` +
          `LEFT(TRIM(column15,'"'),10) AS "donationDate", CAST(NULL AS INTEGER) AS cycle, ` +
          `TRIM(column29,'"') AS city, TRIM(column30,'"') AS state, TRIM(column52,'"') AS employer, TRIM(column53,'"') AS occupation ` +
          `FROM ${rel} WHERE ${where.join(" AND ")} ORDER BY "donationDate" DESC LIMIT ${limit}`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    return rows.map((r) => toCandidate(r, "ny"))
  } finally {
    conn.closeSync()
  }
}

/** Federal (FEC) contributions across available cycles. name is "LAST, FIRST". */
export async function searchFECDonations(f: DonationFilters, limit = 25): Promise<DonationCandidate[]> {
  const lastName = f.lastName?.trim()
  if (!lastName) return []
  const cycles = fecCycles()
  if (cycles.length === 0) return []

  const list = cycles.map((c) => sqlString(toSqlPath(getFecIndivParquetPath(c)))).join(", ")
  const cmte = getFecCommitteesParquetPath()
  const hasCmte = existsSync(cmte)
  const cmteJoin = hasCmte
    ? `LEFT JOIN read_parquet(${sqlString(toSqlPath(cmte))}) c ON c.committee_id = ` +
      `(CASE WHEN d.other_id IS NOT NULL AND LEFT(d.other_id,1)='C' THEN d.other_id ELSE d.cmte_id END)`
    : ""
  const recipient = hasCmte ? "c.committee_name" : "CAST(NULL AS VARCHAR)"

  const where = [`(d.memo_cd IS NULL OR d.memo_cd != 'X')`, `UPPER(d.name) LIKE UPPER(${sqlString(lastName + ",")}) || '%'`]
  const first = f.firstName?.trim()
  if (first) where.push(`UPPER(d.name) LIKE '%' || UPPER(${sqlString(first)}) || '%'`)
  const st = f.state?.trim()
  if (st) where.push(`d.state = UPPER(${sqlString(st)})`)
  const zip = f.zip?.trim().replace(/\D/g, "")
  if (zip) where.push(`LEFT(d.zip_code, ${zip.length}) = ${sqlString(zip)}`)

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `WITH d AS (SELECT *, CAST(regexp_extract(filename, 'indiv_(\\d{4})\\.parquet', 1) AS INTEGER) AS cycle ` +
          `FROM read_parquet([${list}], union_by_name=true, filename=true)) ` +
          `SELECT (d.cycle || ':' || d.tran_id) AS "refKey", d.name AS "donorName", ${recipient} AS recipient, ` +
          `d.transaction_amt AS amount, CAST(d.transaction_dt AS VARCHAR) AS "donationDate", d.cycle, ` +
          `d.city, d.state, d.employer, d.occupation ` +
          `FROM d ${cmteJoin} WHERE ${where.join(" AND ")} ORDER BY d.transaction_dt DESC NULLS LAST LIMIT ${limit}`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    return rows.map((r) => toCandidate(r, "fec"))
  } finally {
    conn.closeSync()
  }
}
