import { fetchCommitteeByFilerId } from "@/lib/campaignFinance"
import { mapCommcandType } from "@/lib/committeeTypes"

// TEMPORARY deploy-verification probe: confirms the DuckDB native binding loads on
// Railway (linux-x64), the committees.parquet is present in the container, and the
// Filer-ID lookup works end-to-end in prod. Returns only public registry fields.
// REMOVE after verifying.
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") || "18217" // Woodstock Democratic Committee
  try {
    const c = await fetchCommitteeByFilerId("NY", id)
    return Response.json({
      ok: true,
      buildMarker: "committee-lookup-probe-1",
      filerId: id,
      found: !!c,
      name: c?.committeeName ?? null,
      rawType: c?.committeeType ?? null,
      mappedType: c ? mapCommcandType(c.committeeType, c.filerType) : null,
      status: c?.status ?? null,
    })
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
