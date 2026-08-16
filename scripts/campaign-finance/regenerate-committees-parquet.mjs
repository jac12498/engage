/**
 * System-admin import: regenerate committees.parquet from a fresh NYSBOE COMMCAND.CSV.
 *
 * Usage:
 *   1. Download the latest COMMCAND file from the NY State Board of Elections
 *      (https://www.elections.ny.gov/CampaignFinance.html) and save it as
 *      data/campaign_finance/ny/COMMCAND.CSV
 *   2. node scripts/campaign-finance/regenerate-committees-parquet.mjs [state]
 *      (state defaults to "ny")
 *   3. Commit the regenerated committees.parquet.
 *
 * Self-contained (uses @duckdb/node-api directly) so it runs with plain `node`,
 * no build/tsx step. Ported from engage.democrat (version10.3).
 */

import path from "path"
import fs from "fs/promises"
import { DuckDBInstance } from "@duckdb/node-api"

const toSqlPath = (p) => p.replace(/\\/g, "/")
const sqlString = (v) => `'${String(v).replace(/'/g, "''")}'`

async function main() {
  const state = (process.argv[2] || "ny").toLowerCase()
  const root = path.join(process.cwd(), "data", "campaign_finance", state)
  const csvPath = path.join(root, "COMMCAND.CSV")
  const parquetPath = path.join(root, "committees.parquet")

  console.log(`State:               ${state}`)
  console.log(`CSV source:          ${csvPath}`)
  console.log(`Parquet destination: ${parquetPath}\n`)

  try {
    await fs.stat(csvPath)
    console.log("✓ CSV file found")
  } catch {
    console.error(`✗ CSV not found at ${csvPath}`)
    console.error("  Download COMMCAND from the NY Board of Elections and save it there first.")
    process.exit(1)
  }

  const instance = await DuckDBInstance.fromCache(":memory:")
  const connection = await instance.connect()

  try {
    console.log("\nConverting CSV → Parquet…")
    await connection.runAndReadAll(`
      COPY (
        SELECT *, ${sqlString(state)} AS source_state
        FROM read_csv_auto(
          ${sqlString(toSqlPath(csvPath))},
          header=false,
          all_varchar=true,
          sample_size=-1,
          ignore_errors=true,
          delim=',',
          quote='"',
          escape='"'
        )
      )
      TO ${sqlString(toSqlPath(parquetPath))} (FORMAT PARQUET, COMPRESSION SNAPPY)
    `)
    console.log("✓ Conversion complete")

    const countResult = await connection.runAndReadAll(
      `SELECT COUNT(*) AS count FROM read_parquet(${sqlString(toSqlPath(parquetPath))})`
    )
    console.log(`✓ Parquet contains ${String(countResult.getRowObjects()[0].count)} rows`)

    // Sanity check: look up a well-known committee name.
    const sample = await connection.runAndReadAll(`
      SELECT TRIM(column00, '"') AS id, TRIM(column01, '"') AS name, TRIM(column04, '"') AS status
      FROM read_parquet(${sqlString(toSqlPath(parquetPath))})
      WHERE LOWER(column01) LIKE '%ulster%'
      LIMIT 5
    `)
    const rows = sample.getRowObjects()
    console.log(`\nSample (name LIKE '%ulster%'): ${rows.length} row(s)`)
    rows.forEach((r) => console.log(`  - ${r.id}: ${r.name} (${r.status})`))
  } finally {
    connection.closeSync()
  }
}

main().catch((err) => {
  console.error("\n✗ Error:", err?.message ?? err)
  process.exit(1)
})
