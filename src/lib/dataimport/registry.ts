import "server-only"
import path from "path"
import { nyCommitteesImporter } from "./nyCommittees"
import { nyDisclosuresImporter } from "./nyDisclosures"
import type { ImporterDef, ImporterInfo } from "./types"

/**
 * The registry of supported importers. Add a new admin import tool by writing an
 * ImporterDef (e.g. federal candidates, another state) and listing it here - the
 * UI and the run action pick it up with no other changes.
 */
export const IMPORTERS: ImporterDef[] = [nyCommitteesImporter, nyDisclosuresImporter]

export function getImporter(purpose: string, jurisdiction: string): ImporterDef | null {
  return IMPORTERS.find((i) => i.purpose === purpose && i.jurisdiction === jurisdiction) ?? null
}

/** Client-safe descriptors incl. the current source status, for the import page. */
export async function listImporterInfo(): Promise<ImporterInfo[]> {
  return Promise.all(
    IMPORTERS.map(async (i): Promise<ImporterInfo> => {
      const status = await i.describeSource()
      return {
        purpose: i.purpose,
        jurisdiction: i.jurisdiction,
        label: i.label,
        fileHint: i.fileHint,
        accept: i.accept,
        note: i.note,
        sourceKind: i.sourceKind,
        sourcePath: path.relative(process.cwd(), i.sourcePath()).replace(/\\/g, "/"),
        sourcePresent: status.present,
        sourceDetail: status.detail,
      }
    }),
  )
}
