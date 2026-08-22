/**
 * Copy the shared `public.districts` + `public.district_types` reference tables
 * (the district hierarchy EngageCampaign reads cross-schema) from the SOURCE db
 * into the DEV db.
 *
 * Why this exists: EngageCampaign PRODUCTION shares one Supabase project with the
 * version10.3 app (ref heypcbktgbpxppkqfrax) — production gets `public.districts`
 * for free from that app. The separate DEV project (ref wkjelsyxeeflslibuinq) is
 * built by `prisma db push`, which only creates the isolated `engagecampaign`
 * schema — so the `public` district tables must be copied in, or the district
 * picker (/candidates/new) fails with `relation "public.districts" does not exist`.
 *
 * SOURCE = version10.3's DATABASE (prod, which owns the tables); read-only.
 * DEST   = EngageCampaign's local .env (dev); guarded so it can never target prod.
 *
 * Run:  node scripts/dev/copy-public-districts.mjs
 * Re-runnable (TRUNCATE + re-insert). Copies only the columns the app uses (no
 * PostGIS geometry), full fidelity otherwise.
 */
import fs from "node:fs"
import dotenv from "dotenv"
import pg from "pg"
const { Pool } = pg

const SOURCE_ENV = "D:/OneDegree/version10.3/.env" // owns public.districts (= EngageCampaign prod)
const DEST_ENV = "D:/EngageCampaign/.env" // dev
const DEV_REF = "wkjelsyxeeflslibuinq"
const PROD_REF = "heypcbktgbpxppkqfrax"

const src = dotenv.parse(fs.readFileSync(SOURCE_ENV))
const dst = dotenv.parse(fs.readFileSync(DEST_ENV))
const srcUrl = src.DIRECT_URL || src.DATABASE_URL
const dstUrl = dst.DIRECT_URL || dst.DATABASE_URL

if (srcUrl === dstUrl) throw new Error("Source and destination are identical — aborting.")
if (dstUrl.includes(PROD_REF)) throw new Error("Destination looks like PROD — aborting.")
if (!dstUrl.includes(DEV_REF)) throw new Error("Destination is not the known DEV ref — aborting.")

const source = new Pool({ connectionString: srcUrl, max: 4 })
const dest = new Pool({ connectionString: dstUrl, max: 4 })

const DTYPE_COLS = ["id", "name", "query_name"]
const DIST_COLS = [
  "id", "name", "district_type_id", "subdivision_of", "subdivision_name",
  "subdivision_order", "eff_date", "term_date", "query_string", "voter_count",
]

const DDL = `
CREATE TABLE IF NOT EXISTS public.district_types (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  query_name text
);
CREATE TABLE IF NOT EXISTS public.districts (
  id                uuid PRIMARY KEY,
  name              text NOT NULL,
  district_type_id  text NOT NULL REFERENCES public.district_types(id),
  subdivision_of    uuid,
  subdivision_name  text,
  subdivision_order integer NOT NULL,
  eff_date          date,
  term_date         date,
  query_string      text,
  voter_count       integer
);
CREATE INDEX IF NOT EXISTS districts_subdivision_of_idx ON public.districts(subdivision_of);
CREATE INDEX IF NOT EXISTS districts_district_type_id_idx ON public.districts(district_type_id);
`

async function copyTable(table, cols) {
  const { rows } = await source.query(`SELECT ${cols.join(",")} FROM public.${table}`)
  await dest.query(`TRUNCATE public.${table} CASCADE`)
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const values = []
    const params = []
    slice.forEach((r, ri) => {
      const ph = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`)
      values.push(`(${ph.join(",")})`)
      cols.forEach((c) => params.push(r[c]))
    })
    await dest.query(
      `INSERT INTO public.${table} (${cols.join(",")}) VALUES ${values.join(",")} ON CONFLICT DO NOTHING`,
      params,
    )
  }
  const { rows: cnt } = await dest.query(`SELECT count(*)::int AS n FROM public.${table}`)
  console.log(`public.${table}: copied ${rows.length}, dest now has ${cnt[0].n}`)
}

;(async () => {
  await dest.query(DDL)
  await copyTable("district_types", DTYPE_COLS) // parent first (FK)
  await copyTable("districts", DIST_COLS)
  await source.end()
  await dest.end()
  console.log("DONE")
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
