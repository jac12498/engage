import "server-only"
import { existsSync } from "fs"
import {
  getDuckDBInstance,
  getFecCommitteesParquetPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"
import { normalizeFecCommitteeId } from "@/lib/committeeTypes"

/**
 * FEC committee master (fec/committees.parquet, built by `npm run finance:generate-fec`).
 * The FEC committee id is `committee_id` (the "C00…" number). Used to look up a
 * federal committee during onboarding and prefill its name — the federal analogue of
 * fetchCommitteeByFilerId (NY) in lib/campaignFinance.ts.
 */

export interface FecCommittee {
  committeeId: string
  name: string | null
  party: string | null
  state: string | null
  treasurerName: string | null
}

const clean = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}

/** Look up an FEC committee by its "C00…" committee id. Null when absent/invalid. */
export async function fetchFecCommittee(rawId: string): Promise<FecCommittee | null> {
  const id = normalizeFecCommitteeId(rawId)
  if (!id) return null
  const p = getFecCommitteesParquetPath()
  if (!existsSync(p)) return null

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    const rows = (
      await conn.runAndReadAll(
        `SELECT committee_name, party_full, state, treasurer_name ` +
          `FROM read_parquet(${sqlString(toSqlPath(p))}) ` +
          `WHERE committee_id = ${sqlString(id)} LIMIT 1`,
      )
    ).getRowObjects() as Record<string, unknown>[]
    if (rows.length === 0) return null
    const r = rows[0]
    return {
      committeeId: id,
      name: clean(r.committee_name),
      party: clean(r.party_full),
      state: clean(r.state),
      treasurerName: clean(r.treasurer_name),
    }
  } finally {
    conn.closeSync()
  }
}
