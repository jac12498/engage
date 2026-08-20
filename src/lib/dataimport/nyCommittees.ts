import "server-only"
import { readFile, writeFile, unlink, stat } from "fs/promises"
import {
  getDuckDBInstance,
  getCommitteeRegistryCsvPath,
  getCommitteeRegistryParquetPath,
  toSqlPath,
  sqlString,
} from "@/lib/duckdb"
import { formatBytes, type ImporterDef, type ImportResult, type ReconcileSummary } from "./types"
import { reconcileInUseCommittees } from "./reconcileCommittees"

/**
 * NY committee registry importer: NYSBOE COMMCAND.CSV -> committees.parquet.
 *
 * COMMCAND is a headerless, double-quoted, 17-column CSV — BUT the status field
 * (column 4) is emitted UNQUOTED (`,ACTIVE,` / `,TERMINATED,`) while its neighbors
 * are quoted. That inconsistency makes DuckDB's parser choke and silently drop
 * large numbers of rows under `ignore_errors`, so a naive read is incomplete.
 *
 * The fix (ported from engage.democrat / version10.3's fix-unquoted-values +
 * convert-fixed-csv-to-parquet): quote the bare status values first, then read
 * with EXPLICIT columns + auto_detect=false + strict_mode=false so nothing is
 * auto-detected away. We import ACTIVE committees only (per requirements).
 */

const STATE = "ny"

// Explicit, zero-padded column names (column00..column16) — matches what the
// reader (lib/campaignFinance.ts) queries, and pins the schema so DuckDB never
// re-detects it.
const COLUMNS = Array.from({ length: 17 }, (_, i) => `'column${String(i).padStart(2, "0")}': 'VARCHAR'`).join(", ")

/** Quote the unquoted status values that break DuckDB's CSV parser. */
function repairLine(line: string): string {
  return line
    .replace(/,ACTIVE,/g, ',"ACTIVE",')
    .replace(/,TERMINATED,/g, ',"TERMINATED",')
    .replace(/,SUSPENDED,/g, ',"SUSPENDED",')
}

async function run(): Promise<ImportResult> {
  const csvPath = getCommitteeRegistryCsvPath(STATE)
  const parquetPath = getCommitteeRegistryParquetPath(STATE)
  const fixedPath = csvPath.replace(/\.csv$/i, ".fixed.csv")

  // 1) Repair the source into a temp file (drop blank lines while we're here).
  const raw = await readFile(csvPath, "utf8")
  const repaired =
    raw
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map(repairLine)
      .join("\n") + "\n"
  await writeFile(fixedPath, repaired)

  const readCsv =
    `read_csv(${sqlString(toSqlPath(fixedPath))}, header=false, all_varchar=true, delim=',', ` +
    `quote='"', escape='"', auto_detect=false, strict_mode=false, parallel=false, ` +
    `columns={${COLUMNS}}, sample_size=-1, ignore_errors=true)`

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    // 2) Sanity-check the shape before touching the existing parquet.
    const probe = await conn.runAndReadAll(`SELECT COUNT(*) AS n FROM ${readCsv}`)
    const total = Number(probe.getRowObjects()[0].n)
    if (total === 0) {
      return { ok: false, error: "No rows could be parsed. Is this a NYSBOE COMMCAND file? Nothing was changed." }
    }

    const activeRes = await conn.runAndReadAll(
      `SELECT COUNT(*) AS n FROM ${readCsv} WHERE UPPER(TRIM(column04, '"')) = 'ACTIVE'`,
    )
    const activeCount = Number(activeRes.getRowObjects()[0].n)
    if (activeCount === 0) {
      return {
        ok: false,
        error: `Parsed ${total.toLocaleString()} rows but found no ACTIVE committees (status column empty or unexpected format). Nothing was changed.`,
      }
    }

    // 3) Write ACTIVE-only rows to the registry parquet.
    await conn.runAndReadAll(
      `COPY (SELECT *, ${sqlString(STATE)} AS source_state FROM ${readCsv} ` +
        `WHERE UPPER(TRIM(column04, '"')) = 'ACTIVE') ` +
        `TO ${sqlString(toSqlPath(parquetPath))} (FORMAT PARQUET, COMPRESSION SNAPPY)`,
    )

    const countRes = await conn.runAndReadAll(
      `SELECT COUNT(*) AS count FROM read_parquet(${sqlString(toSqlPath(parquetPath))})`,
    )
    const rowCount = Number(countRes.getRowObjects()[0].count)

    const sampleRes = await conn.runAndReadAll(
      `SELECT TRIM(column00, '"') AS id, TRIM(column01, '"') AS name, TRIM(column04, '"') AS status ` +
        `FROM read_parquet(${sqlString(toSqlPath(parquetPath))}) WHERE LOWER(column01) LIKE '%committee%' LIMIT 5`,
    )
    const sample = sampleRes.getRowObjects().map((r) => ({
      id: String(r.id ?? ""),
      name: String(r.name ?? ""),
      status: r.status == null ? null : String(r.status),
    }))

    // Reconcile in-use committees against the FULL new file (all statuses), so a
    // termination (hidden from the ACTIVE parquet) is still detected. Non-fatal:
    // the parquet import already succeeded above, so a reconciliation hiccup must
    // not fail the whole import.
    let reconciliation: ReconcileSummary | undefined
    try {
      reconciliation = await reconcileInUseCommittees(
        async (sql) => (await conn.runAndReadAll(sql)).getRowObjects() as Record<string, unknown>[],
        readCsv,
        STATE,
      )
    } catch (err) {
      console.error("[nyCommittees] reconciliation failed (import still succeeded):", err)
    }

    return { ok: true, rowCount, sample, reconciliation }
  } finally {
    conn.closeSync()
    await unlink(fixedPath).catch(() => {})
  }
}

export const nyCommitteesImporter: ImporterDef = {
  purpose: "committees",
  jurisdiction: "NY",
  label: "New York - Committees & Candidates (NYSBOE COMMCAND)",
  fileHint: "COMMCAND.CSV",
  accept: ".csv,.CSV",
  note: "Repairs known NYSBOE formatting issues (unquoted status values) and imports ACTIVE committees only.",
  sourceKind: "file",
  sourcePath: () => getCommitteeRegistryCsvPath(STATE),
  describeSource: async () => {
    try {
      const s = await stat(getCommitteeRegistryCsvPath(STATE))
      if (s.isFile()) return { present: true, detail: `${formatBytes(s.size)} · updated ${s.mtime.toLocaleString()}` }
    } catch {
      // no file yet
    }
    return { present: false, detail: null }
  },
  run,
}
