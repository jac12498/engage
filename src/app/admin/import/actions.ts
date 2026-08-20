"use server"

import path from "path"
import { mkdir, writeFile, stat } from "fs/promises"
import { auth } from "@/lib/auth"
import { getImporter } from "@/lib/dataimport/registry"
import type { ImportResult } from "@/lib/dataimport/types"

/**
 * Run an admin data import (system admin only). Two ways to supply the source:
 *  - upload a file in the form -> it's written to the importer's source path, then processed
 *  - drop the file into the data folder beforehand -> processed in place (no upload)
 */
export async function runDataImport(formData: FormData): Promise<ImportResult> {
  const session = await auth()
  if (!session?.user?.id || !session.isSystemAdmin) return { ok: false, error: "Not authorized." }

  const purpose = String(formData.get("purpose") || "")
  const jurisdiction = String(formData.get("jurisdiction") || "")
  const importer = getImporter(purpose, jurisdiction)
  if (!importer) return { ok: false, error: "That data type isn't supported yet." }

  const src = importer.sourcePath()
  const rel = path.relative(process.cwd(), src).replace(/\\/g, "/")

  if (importer.sourceKind === "file") {
    const file = formData.get("file")
    if (file instanceof File && file.size > 0) {
      if (file.size > 30 * 1024 * 1024) return { ok: false, error: "File is too large (max 30 MB)." }
      await mkdir(path.dirname(src), { recursive: true })
      await writeFile(src, new Uint8Array(await file.arrayBuffer()))
    } else {
      // No upload - require a file already placed at the source path.
      try {
        await stat(src)
      } catch {
        return {
          ok: false,
          error: `No file uploaded, and none found at ${rel}. Upload ${importer.fileHint} or place it there first.`,
        }
      }
    }
  }
  // directory-kind importers convert whatever is staged in their folder; run()
  // validates the folder contents and errors clearly when it's empty.

  try {
    return await importer.run()
  } catch (err) {
    console.error("[runDataImport]", err)
    const detail = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Import failed: ${detail}` }
  }
}
