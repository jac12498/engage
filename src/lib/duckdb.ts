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

/**
 * Returns a cached DuckDB instance for the given path. Use ':memory:' for
 * ephemeral read-only query workloads (all our parquet reads).
 */
export async function getDuckDBInstance(databasePath: string = ":memory:"): Promise<DuckDBInstance> {
  const { DuckDBInstance } = await import("@duckdb/node-api")
  return DuckDBInstance.fromCache(databasePath)
}
