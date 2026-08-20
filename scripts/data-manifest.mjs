/**
 * data-manifest.mjs
 * Single source of truth for which large data files live in Supabase Storage and
 * get hydrated onto the runtime filesystem (Railway volume) at boot.
 *
 * Each entry's `key` is BOTH the object path inside the bucket AND the path under
 * the local `data/` directory — a 1:1 mapping keeps the upload and seed scripts in
 * lockstep. Small files that are committed to git (e.g. the NY committee registry
 * `committees.parquet`) are intentionally NOT listed here.
 *
 * DuckDB reads these from the local filesystem; Supabase Storage is only the source
 * of truth used to (re)populate the volume — direct httpfs reads were too slow.
 */

export const BUCKET = "engage-data"

/** Storage/local key (relative to the bucket root and to `data/`). */
export const CAMPAIGN_FINANCE_FILES = [
  // NY disclosures — powers contact↔donation matching (donations.ts, committeeDonors.ts).
  "campaign_finance/ny/disclosures/data.parquet",
  // FEC federal donor search (donations.ts, fecCommittees.ts).
  "campaign_finance/fec/committees.parquet",
  "campaign_finance/fec/indiv_2024.parquet",
  "campaign_finance/fec/indiv_2026.parquet",
]

// NY voter file — large (~1 GB). Powers the Voter File features and Contacts→voter
// record linking. Only these two parquets are read at runtime (lib/voters.ts); the
// schema/election-mapping JSONs are convert-script inputs, not needed in prod.
export const VOTER_FILES = [
  "voter_records/ny/voters.parquet",
  "voter_records/ny/voting_history.parquet",
]

/** The set the seed script hydrates in production. */
export const SEED_FILES = [...CAMPAIGN_FINANCE_FILES, ...VOTER_FILES]

/** Resolve the public object URL for a key, given the Supabase project URL. */
export function publicUrl(supabaseUrl, key) {
  const base = supabaseUrl.replace(/\/+$/, "")
  return `${base}/storage/v1/object/public/${BUCKET}/${key}`
}
