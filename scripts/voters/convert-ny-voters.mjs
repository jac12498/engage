/**
 * Convert the NY State BOE voter file (AllNYSVoters_*.csv) → two parquets:
 *   data/voter_records/ny/voters.parquet          (voter identity, address, party, districts)
 *   data/voter_records/ny/voting_history.parquet  (normalized per-election participation)
 *
 * The source CSV is ~6 GB, so this is an offline/CLI batch job (not the web import tool).
 * Place AllNYSVoters_*.csv in data/voter_records/ny/ and run:
 *   npm run voters:convert-ny [--force] [--sample]
 *     --force   rebuild even if the parquets look up to date
 *     --sample  use sample_voters.csv instead of the full file (for testing)
 *
 * County complication: voting-history election codes vary by county. We standardize
 * them by joining raw codes to election_mappings.json (aliasToElectionCode + canonical
 * self-maps); unmapped codes are kept RAW (is_standardized=false) so nothing is lost,
 * and unmapped_election_codes.json reports coverage for iterating on the mappings.
 *
 * Ported from engage.democrat (version10.3) scripts/ny/convert-voters.ts.
 */

import path from "path"
import { existsSync, readdirSync, statSync } from "fs"
import { readFile, writeFile, stat } from "fs/promises"
import { DuckDBInstance } from "@duckdb/node-api"

const ARGS = process.argv.slice(2)
const FORCE = ARGS.includes("--force")
const SAMPLE = ARGS.includes("--sample")

const dataRoot = () => path.join(process.cwd(), "data", "voter_records", "ny")
const votersParquetPath = () => path.join(dataRoot(), "voters.parquet")
const votingHistoryParquetPath = () => path.join(dataRoot(), "voting_history.parquet")
const schemaPath = () => path.join(dataRoot(), "schema.json")
const electionMappingsPath = () => path.join(dataRoot(), "election_mappings.json")
const unmappedReportPath = () => path.join(dataRoot(), "unmapped_election_codes.json")

const toSqlPath = (p) => p.replace(/\\/g, "/")
const sqlString = (v) => `'${String(v).replace(/'/g, "''")}'`
const escapeSql = (v) => String(v).replace(/'/g, "''")
const sqlInList = (vals) => (vals.length === 0 ? "('')" : `(${vals.map((v) => `'${escapeSql(v)}'`).join(", ")})`)
const decodeRawElectionCode = (raw) => raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()

/** Resolve the source CSV: the newest AllNYSVoters_*.csv, or sample_voters.csv with --sample. */
function resolveCsvPath() {
  const root = dataRoot()
  if (SAMPLE) return path.join(root, "sample_voters.csv")
  let files = []
  try {
    files = readdirSync(root).filter((f) => /^AllNYSVoters.*\.csv$/i.test(f))
  } catch {
    return null
  }
  if (files.length === 0) return null
  return path.join(root, files.sort().reverse()[0])
}

function shouldConvert(csvPath) {
  if (FORCE) return { go: true, reason: "forced refresh" }
  if (!csvPath || !existsSync(csvPath)) return { go: false, reason: "source CSV not found" }
  const vp = votersParquetPath()
  const hp = votingHistoryParquetPath()
  if (!existsSync(vp)) return { go: true, reason: "voters.parquet missing" }
  if (!existsSync(hp)) return { go: true, reason: "voting_history.parquet missing" }
  if (statSync(csvPath).mtimeMs > statSync(vp).mtimeMs) return { go: true, reason: "CSV is newer than parquet" }
  return { go: false, reason: "parquet files are up to date" }
}

/** '{col0:VARCHAR, …}' definition for read_csv, from the schema (all VARCHAR; typed in SELECT). */
const buildColumnDefinitions = (schema) => schema.columns.map((c) => `'column${c.index}': 'VARCHAR'`).join(", ")

/** SELECT list that renames columnN → name and converts YYYYMMDD date columns. Skips voting_history_raw. */
function buildSelectStatement(schema) {
  const parts = []
  for (const col of schema.columns) {
    if (col.name === "voting_history_raw") continue
    const src = `column${col.index}`
    if (col.type === "DATE" && col.format === "YYYYMMDD") {
      parts.push(
        `CASE WHEN LENGTH(TRIM(${src})) = 8 THEN TRY_CAST(SUBSTRING(${src},1,4) || '-' || SUBSTRING(${src},5,2) || '-' || SUBSTRING(${src},7,2) AS DATE) ELSE NULL END AS ${col.name}`,
      )
    } else {
      parts.push(`${src} AS ${col.name}`)
    }
  }
  return parts
}

function buildAliasMappingsValuesSql(aliasToElectionCode) {
  const entries = Object.entries(aliasToElectionCode)
    .map(([rawAlias, code]) => {
      const raw = String(rawAlias || "").trim().toLowerCase()
      const std = String(code || "").trim().toLowerCase()
      return raw && std ? `('${escapeSql(raw)}', '${escapeSql(std)}')` : null
    })
    .filter(Boolean)
  if (entries.length === 0) return `SELECT CAST(NULL AS VARCHAR) AS raw_code, CAST(NULL AS VARCHAR) AS standardized_code WHERE 1=0`
  return `VALUES ${entries.join(",\n        ")}`
}

/** The normalized voting-history SELECT: split ';', extract code + method, standardize, derive year/type, drop ignored. */
function parseVotingHistorySQL(csvPath, columnDefinitions, aliasToElectionCode, ignoredElectionCodes = []) {
  const aliasValuesSql = buildAliasMappingsValuesSql(aliasToElectionCode)
  const ignoreBeforeYear = new Date().getFullYear() - 10
  const genericGeneralCodesSql = sqlInList(["general election", "general", "gen election", "general election,"])
  const manualIgnored = ignoredElectionCodes.map((c) => c.trim().toLowerCase()).filter(Boolean)
  const hasManualIgnored = manualIgnored.length > 0
  const manualIgnoredSql = hasManualIgnored ? sqlInList(manualIgnored) : null

  return `
    WITH alias_mappings(raw_code, standardized_code) AS (
      ${aliasValuesSql}
    ),
    raw_voters AS (
      SELECT column45 AS state_voter_id, column46 AS voting_history_raw, column23 AS county_code
      FROM read_csv(${sqlString(toSqlPath(csvPath))}, delim=',', header=false, ignore_errors=true, columns={ ${columnDefinitions} })
      WHERE column45 IS NOT NULL AND column46 IS NOT NULL AND TRIM(column46) != ''
    ),
    split_history AS (
      SELECT state_voter_id, county_code, UNNEST(STRING_SPLIT(voting_history_raw, ';')) AS election_entry
      FROM raw_voters WHERE voting_history_raw IS NOT NULL
    ),
    extracted_history AS (
      SELECT state_voter_id, county_code,
        TRIM(REGEXP_EXTRACT(election_entry, '^([^(]+)', 1)) AS raw_election_code,
        REGEXP_EXTRACT(election_entry, '\\(([^)]+)\\)', 1) AS vote_method,
        election_entry
      FROM split_history
      WHERE election_entry IS NOT NULL AND TRIM(election_entry) != ''
        AND REGEXP_EXTRACT(election_entry, '^([^(]+)', 1) IS NOT NULL
    ),
    enriched_history AS (
      SELECT eh.state_voter_id, eh.county_code, eh.raw_election_code, eh.vote_method, am.standardized_code,
        TRY_CAST(REGEXP_EXTRACT(eh.election_entry, '(\\d{4})', 1) AS INTEGER) AS election_year,
        CASE
          WHEN UPPER(eh.election_entry) LIKE '%PRESIDENTIAL PRIMARY%' OR UPPER(eh.election_entry) LIKE '%PRES%PRIM%' THEN 'PRESIDENTIAL_PRIMARY'
          WHEN UPPER(eh.election_entry) LIKE '%PRIMARY%' OR UPPER(eh.election_entry) LIKE '%PRIM%' THEN 'PRIMARY'
          WHEN UPPER(eh.election_entry) LIKE '%GENERAL%' OR UPPER(eh.election_entry) LIKE '%GEN%' THEN 'GENERAL'
          WHEN UPPER(eh.election_entry) LIKE '%SPECIAL%' OR UPPER(eh.election_entry) LIKE '%SPEC%' THEN 'SPECIAL'
          WHEN UPPER(eh.election_entry) LIKE '%RUNOFF%' THEN 'RUNOFF'
          ELSE NULL
        END AS election_type_hint,
        CASE
          WHEN am.standardized_code IS NULL AND (
            (LOWER(TRIM(eh.raw_election_code)) IN ${genericGeneralCodesSql}
             AND (TRY_CAST(REGEXP_EXTRACT(eh.election_entry, '(\\d{4})', 1) AS INTEGER) IS NULL
                  OR TRY_CAST(REGEXP_EXTRACT(eh.election_entry, '(\\d{4})', 1) AS INTEGER) <= ${ignoreBeforeYear}))
            ${hasManualIgnored ? `OR LOWER(TRIM(eh.raw_election_code)) IN ${manualIgnoredSql}` : ""}
          ) THEN TRUE ELSE FALSE
        END AS is_ignored_unmapped
      FROM extracted_history eh
      LEFT JOIN alias_mappings am ON LOWER(eh.raw_election_code) = am.raw_code
    )
    SELECT eh.state_voter_id, eh.county_code,
      COALESCE(eh.standardized_code, LOWER(eh.raw_election_code)) AS election_code,
      eh.raw_election_code,
      CASE WHEN eh.standardized_code IS NOT NULL THEN TRUE ELSE FALSE END AS is_standardized,
      eh.vote_method, eh.election_year, eh.election_type_hint
    FROM enriched_history eh
    WHERE COALESCE(eh.is_ignored_unmapped, FALSE) = FALSE
  `
}

async function writeUnmappedReport(conn, hpPath, ignoredElectionCodes) {
  const hp = sqlString(toSqlPath(hpPath))
  const total = Number((await conn.runAndReadAll(`SELECT COUNT(*) AS n FROM ${hp}`)).getRowObjects()[0].n)
  const mapped = Number(
    (await conn.runAndReadAll(`SELECT COUNT(*) AS n FROM ${hp} WHERE COALESCE(is_standardized, FALSE) = TRUE`)).getRowObjects()[0].n,
  )
  const unmappedRows = (
    await conn.runAndReadAll(`
      SELECT LOWER(CAST(raw_election_code AS VARCHAR)) AS raw_code, COUNT(*) AS row_count,
             MIN(election_year) AS min_year, MAX(election_year) AS max_year, MAX(election_type_hint) AS type_hint
      FROM ${hp}
      WHERE COALESCE(is_standardized, FALSE) = FALSE AND raw_election_code IS NOT NULL AND TRIM(CAST(raw_election_code AS VARCHAR)) <> ''
      GROUP BY 1 ORDER BY row_count DESC, raw_code ASC
    `)
  ).getRowObjects()

  let ignoredRows = 0
  const ignored = (ignoredElectionCodes || []).map((c) => c.trim().toLowerCase()).filter(Boolean)
  if (ignored.length > 0) {
    ignoredRows = Number(
      (
        await conn.runAndReadAll(
          `SELECT COUNT(*) AS n FROM ${hp} WHERE COALESCE(is_standardized, FALSE) = FALSE AND LOWER(TRIM(CAST(raw_election_code AS VARCHAR))) IN ${sqlInList(ignored)}`,
        )
      ).getRowObjects()[0].n,
    )
  }
  const attempted = total - ignoredRows
  const coverage = attempted > 0 ? Number(((mapped / attempted) * 100).toFixed(2)) : 0

  await writeFile(
    unmappedReportPath(),
    JSON.stringify(
      {
        description: "NY raw election codes not mapped to standardized abbreviations",
        generatedAt: new Date().toISOString(),
        totalRows: total,
        ignoredRows,
        attemptedToMap: attempted,
        mappedRows: mapped,
        unmappedRows: attempted - mapped,
        rowCoveragePercent: coverage,
        distinctUnmappedCodes: unmappedRows.length,
        unmapped: unmappedRows.map((r) => ({
          rawCode: String(r.raw_code || ""),
          decodedLabel: decodeRawElectionCode(String(r.raw_code || "")),
          rowCount: Number(r.row_count || 0),
          minYear: r.min_year == null ? null : Number(r.min_year),
          maxYear: r.max_year == null ? null : Number(r.max_year),
          electionTypeHint: r.type_hint == null ? null : String(r.type_hint),
        })),
      },
      null,
      2,
    ),
    "utf-8",
  )
  return { total, mapped, coverage, distinctUnmapped: unmappedRows.length }
}

async function main() {
  console.log("\n🗳️  NY voter file → parquet\n")
  const csvPath = resolveCsvPath()
  const decision = shouldConvert(csvPath)
  if (!decision.go) {
    console.log(`✓ ${decision.reason} — nothing to do (use --force to rebuild).`)
    return
  }
  console.log(`📋 ${decision.reason}`)
  console.log(`📄 Source: ${csvPath}`)

  const schema = JSON.parse(await readFile(schemaPath(), "utf-8"))
  const mappings = JSON.parse(await readFile(electionMappingsPath(), "utf-8"))
  console.log(`   schema v${schema.version}, ${schema.columns.length} cols; ${Object.keys(mappings.electionCodeMappings || {}).length} elections, ${Object.keys(mappings.aliasToElectionCode || {}).length} aliases\n`)

  const columnDefs = buildColumnDefinitions(schema)
  const selectParts = buildSelectStatement(schema)

  const instance = await DuckDBInstance.fromCache(":memory:")
  const conn = await instance.connect()
  try {
    console.log("📊 Building voters.parquet…")
    await conn.runAndReadAll(`
      COPY (
        SELECT ${selectParts.join(", ")}
        FROM read_csv(${sqlString(toSqlPath(csvPath))}, delim=',', header=false, ignore_errors=true, columns={ ${columnDefs} })
      ) TO ${sqlString(toSqlPath(votersParquetPath()))} (FORMAT PARQUET, COMPRESSION SNAPPY)
    `)
    const vCount = Number((await conn.runAndReadAll(`SELECT COUNT(*) AS n FROM read_parquet(${sqlString(toSqlPath(votersParquetPath()))})`)).getRowObjects()[0].n)
    console.log(`   ✅ voters.parquet — ${vCount.toLocaleString()} voters (${(statSync(votersParquetPath()).size / 1048576).toFixed(1)} MB)\n`)

    console.log("📊 Building voting_history.parquet…")
    const canonicalSelf = Object.fromEntries(
      Object.keys(mappings.electionCodeMappings || {}).map((c) => [String(c).toLowerCase(), String(c).toLowerCase()]),
    )
    const allAliases = { ...canonicalSelf, ...(mappings.aliasToElectionCode || {}) }
    const historySql = parseVotingHistorySQL(csvPath, columnDefs, allAliases, mappings.ignoredElectionCodes || [])
    await conn.runAndReadAll(`COPY (${historySql}) TO ${sqlString(toSqlPath(votingHistoryParquetPath()))} (FORMAT PARQUET, COMPRESSION SNAPPY)`)
    console.log(`   ✅ voting_history.parquet (${(statSync(votingHistoryParquetPath()).size / 1048576).toFixed(1)} MB)`)

    const rep = await writeUnmappedReport(conn, votingHistoryParquetPath(), mappings.ignoredElectionCodes || [])
    console.log(`   📈 history rows: ${rep.total.toLocaleString()} · standardized: ${rep.coverage}% · unmapped codes: ${rep.distinctUnmapped}`)
    console.log(`   ✓ ${unmappedReportPath()}\n`)
    console.log("✅ Done.\n")
  } finally {
    conn.closeSync()
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err?.message ?? err)
  process.exit(1)
})
