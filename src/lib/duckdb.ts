import "server-only"
import path from "path"

// Minimal DuckDB helper for querying campaign-finance parquet files. Data lives on
// the filesystem under data/campaign_finance/{state}/ (committed for the small
// committee registry; a Railway volume at the same path for larger future datasets).
// Ported/trimmed from engage.democrat (version10.3) lib/duckdb.ts.

type DuckDBInstance = import("@duckdb/node-api").DuckDBInstance

/** DuckDB on Windows requires forward slashes in file paths. */
export function toSqlPath(p: string): string {
  return p.replace(/\\/g, "/")
}

/** Single-quote + escape a string for inline SQL. */
export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

export function getCampaignFinanceRoot(): string {
  return path.join(process.cwd(), "data", "campaign_finance")
}

export function getCommitteeRegistryParquetPath(state: string): string {
  return path.join(getCampaignFinanceRoot(), state.toLowerCase(), "committees.parquet")
}

export function getCommitteeRegistryCsvPath(state: string): string {
  return path.join(getCampaignFinanceRoot(), state.toLowerCase(), "COMMCAND.CSV")
}

/** Directory holding a state's disclosure period CSVs (headerless NYSBOE files). */
export function getDisclosuresDir(state: string): string {
  return path.join(getCampaignFinanceRoot(), state.toLowerCase(), "disclosures")
}

/** Combined disclosures parquet (all period CSVs unioned). Large (~hundreds of MB). */
export function getDisclosuresParquetPath(state: string): string {
  return path.join(getDisclosuresDir(state), "data.parquet")
}

// FEC (federal) parquets live under data/campaign_finance/fec/ (built offline by
// `npm run finance:generate-fec`).
export function getFecDir(): string {
  return path.join(getCampaignFinanceRoot(), "fec")
}
export function getFecIndivParquetPath(cycle: number): string {
  return path.join(getFecDir(), `indiv_${cycle}.parquet`)
}
export function getFecCommitteesParquetPath(): string {
  return path.join(getFecDir(), "committees.parquet")
}

// Voter records live under data/voter_records/{state}/ (built offline by
// scripts/voters/convert-ny-voters.mjs; large parquets sit on a Railway volume).
export function getVoterRecordsRoot(): string {
  return path.join(process.cwd(), "data", "voter_records")
}

/** Main voter file (identity, address, party, districts). Large (~650 MB for NY). */
export function getVotersParquetPath(state: string): string {
  return path.join(getVoterRecordsRoot(), state.toLowerCase(), "voters.parquet")
}

/** Normalized per-election participation (standardized + raw codes). Large (~440 MB for NY). */
export function getVotingHistoryParquetPath(state: string): string {
  return path.join(getVoterRecordsRoot(), state.toLowerCase(), "voting_history.parquet")
}

/**
 * Returns a cached DuckDB instance for the given path. Use ':memory:' for
 * ephemeral read-only query workloads (all our parquet reads).
 */
export async function getDuckDBInstance(databasePath: string = ":memory:"): Promise<DuckDBInstance> {
  const { DuckDBInstance } = await import("@duckdb/node-api")
  return DuckDBInstance.fromCache(databasePath)
}
