/**
 * upload-data-to-storage.mjs
 * Uploads the large data files (see scripts/data-manifest.mjs) from the local `data/`
 * directory to the Supabase Storage `engage-data` bucket, so a deployed instance can
 * hydrate them via seed-volume.mjs. Idempotent: skips a file already in the bucket at
 * the same byte size, re-uploads otherwise. Uses the resumable (TUS) protocol so the
 * large parquets (hundreds of MB) upload reliably.
 *
 * Requires (from .env or the shell):
 *   NEXT_PUBLIC_SUPABASE_URL       e.g. https://<ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY      service_role key (bucket admin + writes)
 *
 * Run: npm run data:upload            (campaign-finance set)
 *      npm run data:upload:voters     (also push the voter files)
 */

import fs from "fs"
import path from "path"
import "dotenv/config"
import { createClient } from "@supabase/supabase-js"
import * as tus from "tus-js-client"
import { BUCKET, CAMPAIGN_FINANCE_FILES, VOTER_FILES } from "./data-manifest.mjs"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env)."
  )
  process.exit(1)
}

const includeVoters = process.argv.includes("--voters")
const FILES = [...CAMPAIGN_FINANCE_FILES, ...(includeVoters ? VOTER_FILES : [])]
const ROOT = process.cwd()

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

/** Ensure the bucket exists and is public with a high per-file size limit. */
async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw new Error(`listBuckets: ${error.message}`)
  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`[upload] bucket "${BUCKET}" exists.`)
    return
  }
  // No per-bucket fileSizeLimit → inherits the project-global upload limit (set in
  // Storage → Settings). Passing one above the global max makes createBucket fail.
  const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  })
  if (createErr) throw new Error(`createBucket: ${createErr.message}`)
  console.log(`[upload] created public bucket "${BUCKET}".`)
}

/** Byte size of the object already in the bucket, or null if absent. */
async function remoteSize(key) {
  const dir = path.posix.dirname(key)
  const base = path.posix.basename(key)
  const { data, error } = await supabase.storage.from(BUCKET).list(dir === "." ? "" : dir, {
    search: base,
    limit: 100,
  })
  if (error) return null
  const hit = data?.find((o) => o.name === base)
  return hit?.metadata?.size ?? null
}

/** Resumable (TUS) upload of one local file to `key` in the bucket. */
function tusUpload(localPath, key, contentType) {
  const projectRef = new URL(SUPABASE_URL).host.split(".")[0]
  return new Promise((resolve, reject) => {
    const file = fs.createReadStream(localPath)
    const size = fs.statSync(localPath).size
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      headers: {
        authorization: `Bearer ${SERVICE_KEY}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6 MB chunks
      uploadSize: size,
      metadata: {
        bucketName: BUCKET,
        objectName: key,
        contentType,
        cacheControl: "3600",
      },
      onError: reject,
      onProgress: (sent, total) => {
        const pct = ((sent / total) * 100).toFixed(0)
        process.stdout.write(`\r[upload] ${key} ${pct}%   `)
      },
      onSuccess: () => {
        process.stdout.write("\n")
        resolve()
      },
    })
    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0])
      upload.start()
    })
  })
}

async function main() {
  await ensureBucket()

  let uploaded = 0
  let skipped = 0
  for (const key of FILES) {
    const localPath = path.join(ROOT, "data", key)
    if (!fs.existsSync(localPath)) {
      console.warn(`[upload] MISSING locally, skipping: data/${key}`)
      continue
    }
    const localSize = fs.statSync(localPath).size
    const rSize = await remoteSize(key)
    if (rSize !== null && Number(rSize) === localSize) {
      console.log(`[upload] up-to-date  ${key} (${(localSize / 1048576).toFixed(1)} MB)`)
      skipped++
      continue
    }
    const contentType = key.endsWith(".json") ? "application/json" : "application/octet-stream"
    console.log(`[upload] sending     ${key} (${(localSize / 1048576).toFixed(1)} MB) ...`)
    await tusUpload(localPath, key, contentType)
    uploaded++
  }

  console.log(`[upload] complete — ${uploaded} uploaded, ${skipped} up-to-date.`)
}

main().catch((e) => {
  console.error(`\n[upload] FAILED: ${e.message}`)
  process.exit(1)
})
