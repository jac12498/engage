"use client"

import { useMemo, useState, useTransition } from "react"
import { UploadCloud, CheckCircle2, Loader2, FolderInput } from "lucide-react"
import { runDataImport } from "@/app/admin/import/actions"
import { formatBytes, type DataPurpose, type ImportResult, type ImporterInfo, type Jurisdiction } from "@/lib/dataimport/types"

const selectCls =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-[#1a1a2e] outline-none transition-colors focus:border-[#1b3a6b] focus:ring-2 focus:ring-[#1b3a6b]/15"

export function DataImportForm({
  purposes,
  jurisdictions,
  importers,
}: {
  purposes: { id: DataPurpose; label: string }[]
  jurisdictions: { id: Jurisdiction; label: string }[]
  importers: ImporterInfo[]
}) {
  const [purpose, setPurpose] = useState<DataPurpose>(purposes[0]?.id ?? "committees")
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(
    importers[0]?.jurisdiction ?? jurisdictions[0]?.id ?? "NY",
  )
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [pending, start] = useTransition()

  const importer = useMemo(
    () => importers.find((i) => i.purpose === purpose && i.jurisdiction === jurisdiction) ?? null,
    [importers, purpose, jurisdiction],
  )
  const supported = Boolean(importer)
  const isDir = importer?.sourceKind === "directory"
  // Directory: run when files are staged. File: run when a file is chosen or already present.
  const canRun = supported && (isDir ? importer!.sourcePresent : Boolean(file) || importer!.sourcePresent)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!importer || !canRun) return
    const fd = new FormData()
    fd.set("purpose", purpose)
    fd.set("jurisdiction", jurisdiction)
    if (!isDir && file) fd.set("file", file)
    setResult(null)
    start(async () => setResult(await runDataImport(fd)))
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Data</span>
          <select
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value as DataPurpose)
              setFile(null)
              setResult(null)
            }}
            className={selectCls}
          >
            {purposes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">Jurisdiction</span>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
            className={selectCls}
          >
            {jurisdictions.map((j) => {
              const ok = importers.some((i) => i.purpose === purpose && i.jurisdiction === j.id)
              return (
                <option key={j.id} value={j.id} disabled={!ok}>
                  {j.label}
                  {ok ? "" : " (coming soon)"}
                </option>
              )
            })}
          </select>
        </label>
      </div>

      {!supported ? (
        <p className="rounded-lg border border-[#c4910a]/30 bg-[#c4910a]/6 px-4 py-2.5 text-sm text-[#7a5a00]">
          That combination isn&rsquo;t supported yet.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border bg-[#f4f6f9] px-4 py-3 text-sm">
            <p className="font-medium text-[#1a1a2e]">{importer!.label}</p>
            {isDir ? (
              <p className="mt-0.5 text-muted-foreground">
                Place the source files ({importer!.fileHint}) in{" "}
                <code className="rounded bg-muted px-1">{importer!.sourcePath}</code>, then convert.
              </p>
            ) : (
              <p className="mt-0.5 text-muted-foreground">
                Expected file <code className="rounded bg-muted px-1">{importer!.fileHint}</code> at{" "}
                <code className="rounded bg-muted px-1">{importer!.sourcePath}</code>.
              </p>
            )}
            {importer!.note && <p className="mt-1 text-xs text-muted-foreground">{importer!.note}</p>}
            {importer!.sourcePresent ? (
              <p className="mt-1.5 text-[#1e6b3a]">Ready: {importer!.sourceDetail}</p>
            ) : (
              <p className="mt-1.5 text-muted-foreground">
                {importer!.sourceDetail ?? (isDir ? "No source files staged yet." : "No file there yet.")}
              </p>
            )}
          </div>

          {!isDir && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#1a1a2e]">
                {importer!.sourcePresent ? "Replace with a new file (optional)" : "Choose file"}
              </span>
              <input
                type="file"
                accept={importer!.accept}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-[#1b3a6b] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#122850]"
              />
              {file && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  {file.name} · {formatBytes(file.size)}
                </span>
              )}
            </label>
          )}
        </>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canRun || pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b3a6b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#122850] disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isDir ? (
            <FolderInput className="h-4 w-4" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {pending ? "Importing…" : isDir ? "Convert to parquet" : file ? "Upload & import" : "Import existing file"}
        </button>
        {isDir && <span className="text-xs text-muted-foreground">Large datasets can take a few minutes.</span>}
      </div>

      {result && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            result.ok
              ? "border-[#1e6b3a]/30 bg-[#1e6b3a]/5 text-[#1a1a2e]"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.ok ? (
            <>
              <p className="flex items-center gap-1.5 font-semibold text-[#1e6b3a]">
                <CheckCircle2 className="h-4 w-4" />
                Imported {result.rowCount?.toLocaleString()} rows.
              </p>
              {result.sample && result.sample.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {result.sample.map((s) => (
                    <li key={s.id}>
                      <span className="font-mono">{s.id}</span> — {s.name}
                      {s.status ? ` (${s.status})` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {result.reconciliation && result.reconciliation.checked > 0 && (
                <div className="mt-3 border-t border-[#1e6b3a]/20 pt-2 text-xs text-muted-foreground">
                  <p className="font-medium text-[#1a1a2e]">
                    Reconciled {result.reconciliation.checked} in-use committee
                    {result.reconciliation.checked === 1 ? "" : "s"}: {result.reconciliation.terminated.length} now
                    terminated, {result.reconciliation.changed.length} changed.
                  </p>
                  {result.reconciliation.terminated.map((c) => (
                    <p key={`t-${c.filerId}`} className="mt-0.5 text-[#b91c1c]">
                      Terminated — {c.name} <span className="font-mono">({c.filerId})</span>
                    </p>
                  ))}
                  {result.reconciliation.changed.map((c) => (
                    <p key={`c-${c.filerId}`} className="mt-0.5 text-[#7a5a00]">
                      Changed — {c.name} <span className="font-mono">({c.filerId})</span>
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            result.error
          )}
        </div>
      )}
    </form>
  )
}
