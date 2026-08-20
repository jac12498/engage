/**
 * seed-volume.mjs
 * Hydrates the runtime filesystem (Railway volume mounted at /app/data, which equals
 * process.cwd()/data) from Supabase Storage on deploy. Skips files that already exist,
 * so it's safe — and cheap — to run on every startup, and it self-heals if the volume
 * is wiped. Runs only on Railway (RAILWAY_ENVIRONMENT_ID / RAILWAY_ENVIRONMENT_NAME).
 *
 * Source of truth for the file list: scripts/data-manifest.mjs.
 */

import fs from "fs"
import path from "path"
import https from "https"
import { SEED_FILES, publicUrl } from "./data-manifest.mjs"

const isRailway = !!(process.env.RAILWAY_ENVIRONMENT_ID || process.env.RAILWAY_ENVIRONMENT_NAME)
if (!isRailway) {
  console.log("[seed-volume] Not on Railway — skipping (dev uses local data/).")
  process.exit(0)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!SUPABASE_URL) {
  console.error("[seed-volume] NEXT_PUBLIC_SUPABASE_URL is not set — cannot locate Storage.")
  process.exit(1)
}

const ROOT = process.cwd()

function download(url, dest) {
  return new Promise((resolve, reject) => {
    function get(u) {
      https
        .get(u, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume()
            return get(res.headers.location)
          }
          if (res.statusCode !== 200) {
            res.resume()
            return reject(new Error(`HTTP ${res.statusCode} for ${u}`))
          }
          const tmp = dest + ".tmp"
          const file = fs.createWriteStream(tmp)
          res.pipe(file)
          file.on("finish", () => {
            file.close(() => {
              fs.renameSync(tmp, dest)
              resolve()
            })
          })
          file.on("error", (err) => {
            fs.rmSync(tmp, { force: true })
            reject(err)
          })
        })
        .on("error", reject)
    }
    get(url)
  })
}

async function main() {
  let downloaded = 0
  let skipped = 0

  for (const key of SEED_FILES) {
    const dest = path.join(ROOT, "data", key)
    fs.mkdirSync(path.dirname(dest), { recursive: true })

    if (fs.existsSync(dest)) {
      const size = fs.statSync(dest).size
      console.log(`[seed-volume] exists      data/${key} (${(size / 1048576).toFixed(1)} MB)`)
      skipped++
      continue
    }

    const url = publicUrl(SUPABASE_URL, key)
    console.log(`[seed-volume] downloading  data/${key} ...`)
    try {
      await download(url, dest)
      const size = fs.statSync(dest).size
      console.log(`[seed-volume] done        data/${key} (${(size / 1048576).toFixed(1)} MB)`)
      downloaded++
    } catch (err) {
      console.error(`[seed-volume] FAILED      data/${key}: ${err.message}`)
      process.exit(1)
    }
  }

  console.log(`[seed-volume] complete — ${downloaded} downloaded, ${skipped} skipped.`)
}

main()
