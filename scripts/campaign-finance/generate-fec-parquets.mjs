/**
 * System-admin import: build the FEC (federal) campaign-finance parquet files.
 *
 * FEC bulk data is huge (individual-contribution zips are multiple GB), so this is
 * a terminal batch job — NOT the in-app import tool. Place the source files in
 * data/campaign_finance/fec/ and run:  npm run finance:generate-fec
 *
 * Source files (download from the FEC bulk-data site):
 *   candidate_summary_{year}.csv   candidate financial summaries, one per cycle
 *   committees-{datetime}.csv      committee master (one snapshot)
 *   ccl{YY}.zip                    candidate↔committee linkage, one per cycle
 *   indiv{YY}.zip                  individual contributions, one per cycle (GBs)
 *
 * Output parquets (ZSTD):
 *   candidates.parquet  committees.parquet  ccl.parquet  indiv_{year}.parquet
 *
 * Individual contributions are limited to the 2024 + 2026 cycles and to
 * ENTITY_TP = 'IND' (people, not orgs) — the rows we match to contacts.
 *
 * Windows-oriented (zip extraction via PowerShell); this is an offline dev/admin
 * step. For prod the built parquets are placed on the Railway volume. Ported from
 * engage.democrat (version10.3) scripts/generateFECParquets.ts.
 *
 * Delete a .parquet to force it to rebuild.
 */

import path from "path"
import fs from "fs"
import { execSync } from "child_process"
import { DuckDBInstance } from "@duckdb/node-api"

const toFwd = (p) => p.replace(/\\/g, "/")
const FEC_DIR = toFwd(path.join(process.cwd(), "data", "campaign_finance", "fec"))
const RAW_DIR = path.join(process.cwd(), "data", "campaign_finance", "fec")

// Cycles for the (huge) individual-contribution files. Per requirements: 2024 + 2026.
const INDIV_CYCLES = ["26", "24"]

const run = async (conn, sql) => (await conn.runAndReadAll(sql)).getRowObjects()
const sizeMB = (p) => {
  try {
    return `${(fs.statSync(p).size / 1024 / 1024).toFixed(1)} MB`
  } catch {
    return "?"
  }
}

async function main() {
  console.log("\n📦 Generating FEC parquet files (delete a .parquet to force a rebuild)\n")
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`❌ ${FEC_DIR} not found. Create it and place the FEC source files there.`)
    process.exit(1)
  }

  const instance = await DuckDBInstance.fromCache(":memory:")
  const conn = await instance.connect()

  // ── 1. Candidates ──────────────────────────────────────────────────────────
  const candidateOut = `${FEC_DIR}/candidates.parquet`
  if (fs.existsSync(candidateOut)) {
    console.log(`   ⏭️  candidates.parquet exists (${sizeMB(candidateOut)}) — skipping`)
  } else {
    const cycleFiles = fs.readdirSync(RAW_DIR).filter((f) => /^candidate_summary_\d{4}\.csv$/.test(f))
    if (cycleFiles.length === 0) {
      console.log("   ⚠️  No candidate_summary_*.csv files — skipping candidates.parquet")
    } else {
      console.log(`   [1] candidates.parquet from ${cycleFiles.length} cycle file(s)…`)
      await conn.runAndReadAll(`
        COPY (
          SELECT
            Cand_Id AS cand_id, Cand_Name AS cand_name, Cand_Office AS cand_office,
            Cand_Office_St AS cand_office_st, Cand_Office_Dist AS cand_office_dist,
            Cand_Party_Affiliation AS cand_party,
            Cand_Incumbent_Challenger_Open_Seat AS cand_ici,
            Total_Receipt AS total_receipts, Total_Disbursement AS total_disbursements,
            Cash_On_Hand_COP AS cash_on_hand, Debt_Owed_By_Committee AS debt_owed,
            Individual_Itemized_Contribution AS individual_itemized,
            Individual_Unitemized_Contribution AS individual_unitemized,
            Individual_Contribution AS individual_total,
            Other_Committee_Contribution AS other_committee_contributions,
            Party_Committee_Contribution AS party_contributions,
            Operating_Expenditure AS operating_expenditure,
            Coverage_Start_Date AS coverage_start_date, Coverage_End_Date AS coverage_end_date,
            Cand_Street_1 AS address_street1, Cand_Street_2 AS address_street2,
            Cand_City AS address_city, Cand_State AS address_state, Cand_Zip AS address_zip,
            CAST(regexp_extract(filename, '(\\d{4})\\.csv$', 1) AS INTEGER) AS cycle
          FROM read_csv('${FEC_DIR}/candidate_summary_*.csv', auto_detect = true, filename = true)
          WHERE Cand_Id IS NOT NULL AND Cand_Id != ''
        ) TO '${candidateOut}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `)
      const [s] = await run(conn, `SELECT COUNT(*) AS cnt, COUNT(DISTINCT cycle) AS cycles FROM read_parquet('${candidateOut}')`)
      console.log(`   ✅ candidates.parquet — ${Number(s.cnt).toLocaleString()} rows / ${s.cycles} cycles`)
    }
  }

  // ── 2. Committees ──────────────────────────────────────────────────────────
  const committeeOut = `${FEC_DIR}/committees.parquet`
  if (fs.existsSync(committeeOut)) {
    console.log(`   ⏭️  committees.parquet exists (${sizeMB(committeeOut)}) — skipping`)
  } else {
    const committeeFiles = fs.readdirSync(RAW_DIR).filter((f) => /^committees-.*\.csv$/.test(f)).sort().reverse()
    if (committeeFiles.length === 0) {
      console.log("   ⚠️  No committees-*.csv file — skipping committees.parquet")
    } else {
      console.log(`   [2] committees.parquet from ${committeeFiles[0]}…`)
      await conn.runAndReadAll(`
        COPY (
          SELECT
            committee_id, name AS committee_name, committee_type AS committee_type_code,
            committee_type_full, designation AS designation_code, designation_full,
            filing_frequency, organization_type, organization_type_full,
            affiliated_committee_name, party, party_full, state, treasurer_name,
            first_file_date, last_file_date,
            CASE WHEN candidate_ids IS NULL OR candidate_ids IN ('{}', '') THEN []::VARCHAR[]
                 ELSE str_split(regexp_replace(candidate_ids, '^\\{|\\}$', '', 'g'), ',') END AS candidate_ids,
            CASE WHEN cycles IS NULL OR cycles IN ('{}', '') THEN []::INTEGER[]
                 ELSE list_transform(str_split(regexp_replace(cycles, '^\\{|\\}$', '', 'g'), ','), x -> TRY_CAST(trim(x) AS INTEGER)) END AS cycles
          FROM read_csv('${FEC_DIR}/${committeeFiles[0]}', auto_detect = true)
          WHERE committee_id IS NOT NULL AND committee_id != ''
        ) TO '${committeeOut}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `)
      const [s] = await run(conn, `SELECT COUNT(*) AS cnt FROM read_parquet('${committeeOut}')`)
      console.log(`   ✅ committees.parquet — ${Number(s.cnt).toLocaleString()} rows`)
    }
  }

  // ── 3. Candidate-Committee Linkage (CCL) ──────────────────────────────────
  const cclOut = `${FEC_DIR}/ccl.parquet`
  if (fs.existsSync(cclOut)) {
    console.log(`   ⏭️  ccl.parquet exists (${sizeMB(cclOut)}) — skipping`)
  } else {
    const CCL_CYCLE_MAP = { "08": 2008, "10": 2010, "12": 2012, "14": 2014, "16": 2016, "18": 2018, "20": 2020, "22": 2022, "24": 2024, "26": 2026 }
    const extracted = []
    console.log("   [3] Extracting CCL zips…")
    for (const [suffix, year] of Object.entries(CCL_CYCLE_MAP)) {
      const zipFile = path.join(RAW_DIR, `ccl${suffix}.zip`)
      const tmpDir = path.join(RAW_DIR, `_ccl_tmp_${suffix}`)
      const destTxt = path.join(RAW_DIR, `ccl_${year}.txt`)
      if (!fs.existsSync(zipFile)) continue
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
      if (extractZipEntry(zipFile, tmpDir, "ccl.txt")) {
        fs.renameSync(path.join(tmpDir, "ccl.txt"), destTxt)
        extracted.push(toFwd(destTxt))
        process.stdout.write(`   ✔ ${year} `)
      }
      fs.rmSync(tmpDir, { recursive: true, force: true })
    }
    console.log("")
    if (extracted.length === 0) {
      console.log("   ⚠️  No CCL files extracted — skipping ccl.parquet")
    } else {
      await conn.runAndReadAll(`
        COPY (
          SELECT column0 AS cand_id, CAST(column1 AS INTEGER) AS cand_election_yr,
                 column3 AS cmte_id, column4 AS cmte_tp, column5 AS cmte_dsgn,
                 CAST(regexp_extract(filename, 'ccl_(\\d{4})\\.txt$', 1) AS INTEGER) AS cycle
          FROM read_csv('${FEC_DIR}/ccl_*.txt', sep = '|', header = false, filename = true)
          WHERE column0 IS NOT NULL AND column0 != '' AND column3 IS NOT NULL AND column3 != ''
        ) TO '${cclOut}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `)
      for (const f of extracted) try { fs.unlinkSync(f) } catch { /* ignore */ }
      const [s] = await run(conn, `SELECT COUNT(*) AS cnt, COUNT(DISTINCT cycle) AS cycles FROM read_parquet('${cclOut}')`)
      console.log(`   ✅ ccl.parquet — ${Number(s.cnt).toLocaleString()} rows / ${s.cycles} cycles`)
    }
  }

  // ── 4. Individual Contributions (2024 + 2026, IND only) ───────────────────
  console.log("   [4] Individual contributions…")
  for (const suffix of INDIV_CYCLES) {
    const year = 2000 + parseInt(suffix, 10)
    const zipFile = path.join(RAW_DIR, `indiv${suffix}.zip`)
    const tmpDir = path.join(RAW_DIR, `_indiv_tmp_${suffix}`)
    const outFile = `${FEC_DIR}/indiv_${year}.parquet`

    if (!fs.existsSync(zipFile)) { console.log(`   ⚠️  indiv${suffix}.zip not found — skipping ${year}`); continue }
    if (fs.existsSync(outFile)) { console.log(`   ⏭️  indiv_${year}.parquet exists (${sizeMB(outFile)}) — skipping`); continue }

    const existingChunks = fs.existsSync(tmpDir) ? fs.readdirSync(tmpDir).filter((f) => /^itcont_\d/.test(f)) : []
    if (existingChunks.length > 0) {
      console.log(`   ♻️  ${year}: using ${existingChunks.length} already-extracted chunk files`)
    } else {
      console.log(`   ⏳ ${year}: extracting itcont chunks from indiv${suffix}.zip (several minutes)…`)
      if (!extractIndivChunks(zipFile, tmpDir)) { console.error(`   ❌ ${year}: extraction failed`); continue }
    }

    console.log(`   🔨 ${year}: building indiv_${year}.parquet…`)
    try {
      await conn.runAndReadAll(`
        COPY (
          SELECT
            TRIM(column00) AS cmte_id, TRIM(column07) AS name, TRIM(column08) AS city,
            UPPER(TRIM(column09)) AS state, LEFT(TRIM(column10), 5) AS zip_code,
            TRIM(column11) AS employer, TRIM(column12) AS occupation,
            TRY_STRPTIME(TRIM(column13), '%m%d%Y')::DATE AS transaction_dt,
            TRY_CAST(TRIM(column14) AS DOUBLE) AS transaction_amt,
            TRIM(column15) AS other_id, TRIM(column16) AS tran_id, UPPER(TRIM(column18)) AS memo_cd
          FROM read_csv('${toFwd(tmpDir)}/itcont_*.txt', delim = '|', header = false, ignore_errors = true,
            columns = {
              'column00':'VARCHAR','column01':'VARCHAR','column02':'VARCHAR','column03':'VARCHAR','column04':'VARCHAR',
              'column05':'VARCHAR','column06':'VARCHAR','column07':'VARCHAR','column08':'VARCHAR','column09':'VARCHAR',
              'column10':'VARCHAR','column11':'VARCHAR','column12':'VARCHAR','column13':'VARCHAR','column14':'VARCHAR',
              'column15':'VARCHAR','column16':'VARCHAR','column17':'VARCHAR','column18':'VARCHAR','column19':'VARCHAR','column20':'VARCHAR'
            })
          WHERE TRIM(column06) = 'IND' AND column00 IS NOT NULL AND TRIM(column00) != ''
          ORDER BY UPPER(TRIM(column09)), TRIM(column07)
        ) TO '${outFile}' (FORMAT PARQUET, COMPRESSION ZSTD)
      `)
    } catch (err) {
      console.error(`   ❌ ${year}: failed —`, err?.message ?? err)
      fs.rmSync(tmpDir, { recursive: true, force: true })
      continue
    }
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch { console.warn(`   ⚠️  Could not remove ${tmpDir} — delete manually`) }
    const [s] = await run(conn, `SELECT COUNT(*) AS cnt, COUNT(DISTINCT state) AS states FROM read_parquet('${outFile}')`)
    console.log(`   ✅ indiv_${year}.parquet — ${Number(s.cnt).toLocaleString()} IND rows / ${s.states} states`)
  }

  console.log(`\n✅ Done. Output: ${FEC_DIR}/\n`)
  conn.closeSync()
}

/** Extract a single named entry from a zip via PowerShell (Windows). Returns true on success. */
function extractZipEntry(zipFile, tmpDir, entryName) {
  const ps1 = path.join(process.cwd(), `_extract_${Date.now()}.ps1`)
  fs.writeFileSync(ps1, [
    `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
    `$zip = [System.IO.Compression.ZipFile]::OpenRead('${toFwd(zipFile)}')`,
    `New-Item -ItemType Directory -Force -Path '${toFwd(tmpDir)}' | Out-Null`,
    `$e = $zip.Entries | Where-Object { $_.Name -eq '${entryName}' } | Select-Object -First 1`,
    `if (-not $e) { $zip.Dispose(); throw '${entryName} not found' }`,
    `[System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path '${toFwd(tmpDir)}' '${entryName}'), $true)`,
    `$zip.Dispose()`,
  ].join("\n"), "utf8")
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${ps1}"`, { stdio: "pipe" })
    return fs.existsSync(path.join(tmpDir, entryName))
  } catch (err) {
    console.error(`   ❌ extract ${entryName}:`, err?.message ?? err)
    return false
  } finally {
    try { fs.unlinkSync(ps1) } catch { /* ignore */ }
  }
}

/** Extract only the dated itcont_*.txt chunk files (skip the combined itcont.txt) via PowerShell. */
function extractIndivChunks(zipFile, tmpDir) {
  const ps1 = path.join(process.cwd(), `_extract_indiv_${Date.now()}.ps1`)
  fs.writeFileSync(ps1, [
    `Add-Type -AssemblyName System.IO.Compression.FileSystem`,
    `$zip = [System.IO.Compression.ZipFile]::OpenRead('${toFwd(zipFile)}')`,
    `New-Item -ItemType Directory -Force -Path '${toFwd(tmpDir)}' | Out-Null`,
    `$entries = $zip.Entries | Where-Object { $_.Name -match '^itcont_\\d' }`,
    `$total = ($entries | Measure-Object).Count; $i = 0`,
    `foreach ($entry in $entries) { $i++; [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, (Join-Path '${toFwd(tmpDir)}' $entry.Name), $true); Write-Host "  [$i/$total] $($entry.Name)" }`,
    `$zip.Dispose()`,
  ].join("\n"), "utf8")
  try {
    execSync(`powershell -ExecutionPolicy Bypass -File "${ps1}"`, { stdio: "inherit" })
    return fs.existsSync(tmpDir) && fs.readdirSync(tmpDir).some((f) => /^itcont_\d/.test(f))
  } catch (err) {
    console.error("   ❌ chunk extraction:", err?.message ?? err)
    fs.rmSync(tmpDir, { recursive: true, force: true })
    return false
  } finally {
    try { fs.unlinkSync(ps1) } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err?.message ?? err)
  process.exit(1)
})
