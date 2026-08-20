/**
 * Admin data-import framework - types + the picklists the UI offers.
 *
 * An import is identified by a **purpose** (what kind of data) and a **jurisdiction**
 * (which authority's format). Each supported combination has an ImporterDef that
 * knows that specific file format. This is the first of many import tools; adding a
 * new one is just another ImporterDef in the registry (see registry.ts). NOT
 * server-only - the client form imports the picklists + these types.
 */

export type DataPurpose = "committees" | "disclosures"
export type Jurisdiction = "NY" | "federal"

/** Whether an importer's source is a single file (uploadable) or a folder of files. */
export type SourceKind = "file" | "directory"

/** Human byte size, e.g. 447 MB. Shared by importer status + the form. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Summary of how a re-import affected committees already in use by the app. */
export interface ReconcileSummary {
  /** In-use committees (with a filerId) checked against the new data. */
  checked: number
  /** Newly terminated / dropped from the active registry this import. */
  terminated: { filerId: string; name: string }[]
  /** Registry details (treasurer/address/name/type) changed this import. */
  changed: { filerId: string; name: string }[]
}

export interface ImportResult {
  ok: boolean
  /** Rows written to the destination dataset on success. */
  rowCount?: number
  /** A few sample rows, for a sanity check in the UI. */
  sample?: { id: string; name: string; status: string | null }[]
  /** Reconciliation of in-use committees (present when the importer supports it). */
  reconciliation?: ReconcileSummary
  error?: string
}

export interface ImporterDef {
  purpose: DataPurpose
  jurisdiction: Jurisdiction
  /** Human label, e.g. "New York - Committees & Candidates (NYSBOE COMMCAND)". */
  label: string
  /** The expected source file, shown as guidance, e.g. "COMMCAND.CSV". */
  fileHint: string
  /** `accept` attribute for the file input (file-kind importers). */
  accept: string
  /** Optional guidance shown under the importer (quirks, filters applied, etc.). */
  note?: string
  /** "file" = a single uploadable file; "directory" = a folder of files to convert. */
  sourceKind: SourceKind
  /** The file path (file kind) or folder path (directory kind) the source lives at. */
  sourcePath: () => string
  /** Server-side status string for the current source (e.g. size, or file count). */
  describeSource: () => Promise<{ present: boolean; detail: string | null }>
  /** Validate + convert the source into the dataset. */
  run: () => Promise<ImportResult>
}

/** A client-safe descriptor of a supported importer (no server functions). */
export interface ImporterInfo {
  purpose: DataPurpose
  jurisdiction: Jurisdiction
  label: string
  fileHint: string
  accept: string
  note?: string
  sourceKind: SourceKind
  /** Repo-relative path where the source lives / should be dropped. */
  sourcePath: string
  /** Whether a usable source is present now (a file, or ≥1 file in the folder). */
  sourcePresent: boolean
  /** Human status of the source, e.g. "11.4 MB · updated …" or "57 CSV files · 2.7 GB". */
  sourceDetail: string | null
}

/** What kinds of data can be imported. */
export const PURPOSES: { id: DataPurpose; label: string }[] = [
  { id: "committees", label: "Committees & Candidates" },
  { id: "disclosures", label: "Financial Disclosures (contributions)" },
]

/** Jurisdictions (only those with an importer are selectable in the UI). */
export const JURISDICTIONS: { id: Jurisdiction; label: string }[] = [
  { id: "NY", label: "New York" },
  { id: "federal", label: "Federal" },
]
