/**
 * Read-only access to the shared district hierarchy.
 *
 * The existing Engage app (version10.3) owns `public.districts` — 5,250 rows of
 * geographic boundaries, each carrying a `query_string` (URL-encoded field=value
 * filter, `|` = OR) that selects that district's voters from the voter parquet,
 * plus a cached `voter_count`. EngageCampaign REUSES this (the moat is the data)
 * rather than rebuilding it.
 *
 * Strict rule: this module only ever READS `public`. Prisma stays scoped to the
 * isolated `engagecampaign` schema; all `public` access goes through these
 * explicit read-only raw queries so the isolation boundary is unambiguous.
 */

import "server-only"
import { Pool } from "pg"

// A small dedicated pool for read-only `public` reads. Separate from Prisma's
// adapter pool to keep the "Prisma never touches public" invariant literal.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
})

export interface DistrictNode {
  id: string
  name: string
  typeName: string
  queryString: string | null
  voterCount: number | null
  /** True if this district can be drilled down further. */
  hasChildren: boolean
}

const SELECT = `
  SELECT
    d.id::text                          AS id,
    d.name                              AS name,
    dt.name                             AS "typeName",
    d.query_string                      AS "queryString",
    d.voter_count                       AS "voterCount",
    EXISTS (
      SELECT 1 FROM public.districts c WHERE c.subdivision_of = d.id
    )                                   AS "hasChildren"
  FROM public.districts d
  JOIN public.district_types dt ON dt.id = d.district_type_id
`

function mapRow(r: Record<string, unknown>): DistrictNode {
  return {
    id: String(r.id),
    name: String(r.name),
    typeName: String(r.typeName),
    queryString: (r.queryString as string | null) ?? null,
    voterCount: r.voterCount == null ? null : Number(r.voterCount),
    hasChildren: Boolean(r.hasChildren),
  }
}

/** Top-level districts (states). Today this is just "New York State". */
export async function getTopLevelDistricts(): Promise<DistrictNode[]> {
  const { rows } = await pool.query(
    `${SELECT} WHERE d.subdivision_of IS NULL ORDER BY d.subdivision_order ASC, d.name ASC`
  )
  return rows.map(mapRow)
}

/** Direct children of a district, for hierarchical drill-down. */
export async function getChildDistricts(parentId: string): Promise<DistrictNode[]> {
  const { rows } = await pool.query(
    `${SELECT} WHERE d.subdivision_of = $1::uuid ORDER BY d.subdivision_order ASC, d.name ASC`,
    [parentId]
  )
  return rows.map(mapRow)
}

/** A single district by id — used to snapshot the candidate's selection. */
export async function getDistrictById(id: string): Promise<DistrictNode | null> {
  const { rows } = await pool.query(`${SELECT} WHERE d.id = $1::uuid LIMIT 1`, [id])
  return rows[0] ? mapRow(rows[0]) : null
}
