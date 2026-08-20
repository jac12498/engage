import "server-only"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"
import type { ReconcileSummary } from "./types"

/**
 * Reconcile committees already IN USE by the app (those with a filerId) against a
 * freshly imported registry, scoped to one state. For each, we look up its current
 * record in the FULL new file (all statuses - the ACTIVE-only parquet would hide a
 * termination) and:
 *   - flag "terminated" when it's no longer ACTIVE (or has dropped out entirely),
 *   - flag "changed" when its details differ from our last snapshot,
 * then store the new status + snapshot. Alerts are only (re)raised on a NEW event,
 * so a dismissed banner doesn't come back every import while nothing has changed.
 * Never edits the user's own committee fields; informational only.
 */

type Row = Record<string, unknown>

interface Snapshot {
  name: string | null
  committeeType: string | null
  treasurer: string | null
  addressLine1: string | null
  city: string | null
  addressState: string | null
  zip: string | null
}

const SNAP_KEYS: (keyof Snapshot)[] = [
  "name",
  "committeeType",
  "treasurer",
  "addressLine1",
  "city",
  "addressState",
  "zip",
]

const clean = (v: unknown): string | null => {
  if (v == null) return null
  const s = String(v).trim()
  return s.length > 0 ? s : null
}
const sqlStr = (v: string) => `'${v.replace(/'/g, "''")}'`

function snapshotsDiffer(prev: Snapshot | null, next: Snapshot): boolean {
  if (!prev) return false // no baseline yet -> not a "change"
  return SNAP_KEYS.some((k) => (prev[k] ?? null) !== (next[k] ?? null))
}

/**
 * @param query run a SQL statement against the importer's DuckDB connection and get row objects
 * @param readCsv a DuckDB relation for the FULL new file (all statuses)
 * @param state   2-letter state code (matches Committee.state case-insensitively)
 */
export async function reconcileInUseCommittees(
  query: (sql: string) => Promise<Row[]>,
  readCsv: string,
  state: string,
): Promise<ReconcileSummary> {
  const committees = await prisma.committee.findMany({
    where: { filerId: { not: null }, state: { equals: state, mode: "insensitive" } },
    select: { id: true, name: true, filerId: true, registryStatus: true, registrySnapshot: true, registryAlert: true },
  })

  const summary: ReconcileSummary = { checked: committees.length, terminated: [], changed: [] }
  if (committees.length === 0) return summary

  const inList = committees.map((c) => sqlStr(c.filerId as string)).join(", ")
  // Use AS + non-reserved alias names — DuckDB treats bare `name`/`status` aliases
  // as keywords and throws a parse error otherwise.
  const rows = await query(
    `SELECT TRIM(column00, '"') AS rid, TRIM(column01, '"') AS rname, TRIM(column04, '"') AS rstatus, ` +
      `TRIM(column05, '"') AS rtype, TRIM(column10, '"') AS tf, TRIM(column11, '"') AS tm, TRIM(column12, '"') AS tl, ` +
      `TRIM(column13, '"') AS a1, TRIM(column14, '"') AS rcity, TRIM(column15, '"') AS rstate, TRIM(column16, '"') AS rzip ` +
      `FROM ${readCsv} WHERE TRIM(column00, '"') IN (${inList})`,
  )
  const byId = new Map<string, Row>()
  for (const r of rows) byId.set(String(r.rid), r)

  for (const c of committees) {
    const r = byId.get(c.filerId as string)
    const newStatus = r ? (clean(r.rstatus)?.toUpperCase() ?? "UNKNOWN") : "MISSING"
    const snap: Snapshot = r
      ? {
          name: clean(r.rname),
          committeeType: clean(r.rtype),
          treasurer: [clean(r.tf), clean(r.tm), clean(r.tl)].filter(Boolean).join(" ") || null,
          addressLine1: clean(r.a1),
          city: clean(r.rcity),
          addressState: clean(r.rstate),
          zip: clean(r.rzip),
        }
      : { name: null, committeeType: null, treasurer: null, addressLine1: null, city: null, addressState: null, zip: null }

    const prevSnap = (c.registrySnapshot as Snapshot | null) ?? null
    const terminated = newStatus !== "ACTIVE"
    const wasActiveOrUnknown = c.registryStatus == null || c.registryStatus === "ACTIVE"
    const changed = !terminated && snapshotsDiffer(prevSnap, snap)

    let alert = c.registryAlert // preserve a dismissed alert unless a new event occurs
    if (terminated && wasActiveOrUnknown) {
      alert = "terminated"
      summary.terminated.push({ filerId: c.filerId as string, name: c.name })
    } else if (changed) {
      alert = "changed"
      summary.changed.push({ filerId: c.filerId as string, name: c.name })
    }

    await prisma.committee.update({
      where: { id: c.id },
      data: {
        registryStatus: newStatus,
        registrySnapshot: snap as unknown as Prisma.InputJsonValue,
        registrySyncedAt: new Date(),
        registryAlert: alert,
      },
    })
  }

  return summary
}
