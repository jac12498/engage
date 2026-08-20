import Link from "next/link"
import { ArrowLeft, Database } from "lucide-react"
import { requireSystemAdmin } from "@/lib/context"
import { listImporterInfo } from "@/lib/dataimport/registry"
import { PURPOSES, JURISDICTIONS } from "@/lib/dataimport/types"
import { DataImportForm } from "@/components/admin/DataImportForm"

export const dynamic = "force-dynamic"
export const metadata = { title: "Data Import · Engage" }

export default async function DataImportPage() {
  await requireSystemAdmin()
  const importers = await listImporterInfo()

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1b3a6b] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to System Admin
        </Link>

        <div className="mt-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b3a6b]/8 text-[#1b3a6b]">
            <Database className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[#1a1a2e]">Data Import</h1>
            <p className="text-sm text-muted-foreground">
              Load reference datasets. Choose what you&rsquo;re importing and where it&rsquo;s from — the format is handled for you.
            </p>
          </div>
        </div>

        <DataImportForm purposes={PURPOSES} jurisdictions={JURISDICTIONS} importers={importers} />

        <div className="mt-6 rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
          <p className="font-medium text-[#1a1a2e]">Federal (FEC) data</p>
          <p className="mt-1">
            FEC bulk data (individual-contribution zips are multiple GB) is built offline, not here.
            Place the source files in <code className="rounded bg-muted px-1">data/campaign_finance/fec/</code> and
            run <code className="rounded bg-muted px-1">npm run finance:generate-fec</code>. See that folder&rsquo;s
            README for the file list.
          </p>
          <p className="mt-3 font-medium text-[#1a1a2e]">NY voter file</p>
          <p className="mt-1">
            The NY State voter file (~6 GB) is also built offline. Place{" "}
            <code className="rounded bg-muted px-1">AllNYSVoters_*.csv</code> in{" "}
            <code className="rounded bg-muted px-1">data/voter_records/ny/</code> and run{" "}
            <code className="rounded bg-muted px-1">npm run voters:convert-ny</code>. See that folder&rsquo;s README.
          </p>
        </div>
      </div>
    </div>
  )
}
