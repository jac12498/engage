import "server-only"
import path from "path"
import { readdir, stat } from "fs/promises"
import { getDuckDBInstance, getDisclosuresDir, getDisclosuresParquetPath, toSqlPath, sqlString } from "@/lib/duckdb"
import { formatBytes, type ImporterDef, type ImportResult } from "./types"

/**
 * NY campaign-finance disclosures importer: the NYSBOE per-filing-period CSVs
 * (2019gen.csv, 2024pri.csv, 2025jan.csv, …) -> one combined data.parquet.
 *
 * These are LARGE (2-3 GB of headerless CSVs -> a ~450 MB parquet), so this is a
 * DROP-THE-FILES-IN-THE-FOLDER + convert flow (no upload). We read with an EXPLICIT
 * 54-column schema + explicit dialect (no auto-sniffing): NYSBOE ships 0-byte period
 * files and read_csv_auto's sniffer errors on them ("could not detect CSV dialect"),
 * even from a file list. Explicit read_csv with strict_mode=false + null_padding +
 * ignore_errors handles the empty/malformed files deterministically. All record types
 * are kept; the contact↔donation matching step filters to contributions at query time.
 *
 * Prod note: the parquet is too big to commit or fit Railway's ephemeral disk —
 * it needs a Railway volume mounted at data/campaign_finance/ (deferred).
 */

const STATE = "ny"

// Explicit 54-column schema (columns 0..53, all VARCHAR) — see the disclosures
// schema.json. Fixing the schema avoids the CSV sniffer entirely.
const COLUMNS = Array.from({ length: 54 }, (_, i) => `'column${String(i).padStart(2, "0")}': 'VARCHAR'`).join(", ")

async function csvFiles(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir)).filter((f) => /\.csv$/i.test(f))
  } catch {
    return []
  }
}

async function run(): Promise<ImportResult> {
  const dir = getDisclosuresDir(STATE)
  const parquetPath = getDisclosuresParquetPath(STATE)
  const rel = path.relative(process.cwd(), dir).replace(/\\/g, "/")

  const csvs = await csvFiles(dir)
  if (csvs.length === 0) {
    return { ok: false, error: `No CSV files found in ${rel}. Place the NYSBOE disclosure period files there first.` }
  }

  // NYSBOE ships some period files as 0 bytes (e.g. several *march.csv). DuckDB's
  // CSV sniffer errors on an empty file, so pass an explicit list of NON-EMPTY
  // files instead of a glob.
  const nonEmpty: string[] = []
  for (const f of csvs) {
    try {
      const s = await stat(path.join(dir, f))
      if (s.isFile() && s.size > 0) nonEmpty.push(path.join(dir, f))
    } catch {
      // skip unreadable entry
    }
  }
  if (nonEmpty.length === 0) {
    return { ok: false, error: `Every CSV in ${rel} is empty. Place the NYSBOE disclosure period files there first.` }
  }
  const fileList = `[${nonEmpty.map((p) => sqlString(toSqlPath(p))).join(", ")}]`

  const readCsv =
    `read_csv(${fileList}, header=false, delim=',', quote='"', escape='"', auto_detect=false, ` +
    `strict_mode=false, null_padding=true, ignore_errors=true, columns={${COLUMNS}}, sample_size=-1)`

  const db = await getDuckDBInstance()
  const conn = await db.connect()
  try {
    // Combine every (non-empty) period CSV into one parquet, with a fixed schema.
    await conn.runAndReadAll(
      `COPY (SELECT * FROM ${readCsv}) TO ${sqlString(toSqlPath(parquetPath))} (FORMAT PARQUET, COMPRESSION SNAPPY)`,
    )

    const countRes = await conn.runAndReadAll(
      `SELECT COUNT(*) AS count FROM read_parquet(${sqlString(toSqlPath(parquetPath))})`,
    )
    const rowCount = Number(countRes.getRowObjects()[0].count)
    return { ok: true, rowCount }
  } finally {
    conn.closeSync()
  }
}

export const nyDisclosuresImporter: ImporterDef = {
  purpose: "disclosures",
  jurisdiction: "NY",
  label: "New York - Campaign Finance Disclosures (NYSBOE)",
  fileHint: "disclosure period CSVs (e.g. 2024gen.csv, 2025jan.csv)",
  accept: ".csv,.CSV",
  note: "Large dataset — place all period CSVs in the folder, then convert. Combines every record type; contribution matching filters at query time.",
  sourceKind: "directory",
  sourcePath: () => getDisclosuresDir(STATE),
  describeSource: async () => {
    const dir = getDisclosuresDir(STATE)
    const csvs = await csvFiles(dir)
    if (csvs.length > 0) {
      let total = 0
      for (const f of csvs) {
        try {
          total += (await stat(path.join(dir, f))).size
        } catch {
          // ignore unreadable entry
        }
      }
      return { present: true, detail: `${csvs.length} CSV file${csvs.length === 1 ? "" : "s"} · ${formatBytes(total)}` }
    }
    // No CSVs — maybe a prebuilt parquet is already present.
    try {
      const ps = await stat(getDisclosuresParquetPath(STATE))
      if (ps.isFile()) return { present: false, detail: `data.parquet present (${formatBytes(ps.size)}); no source CSVs to convert` }
    } catch {
      // none
    }
    return { present: false, detail: null }
  },
  run,
}
