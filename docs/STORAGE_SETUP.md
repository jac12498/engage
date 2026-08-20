# Data file storage (campaign finance & voter parquets)

DuckDB queries large parquet/JSON files from the **local filesystem** under `data/`.
In dev those files sit on disk. In production they live on a **Railway persistent
volume** mounted at `/app/data` (= `process.cwd()/data`), hydrated on boot from
**Supabase Storage**. Direct httpfs reads from Storage were too slow, so Storage is
only the source of truth — never the query path.

## What lives where

| File | Size | In git? | In Storage? |
|------|------|---------|-------------|
| `data/campaign_finance/ny/committees.parquet` | ~0.5 MB | ✅ committed | no (small, runtime registry lookup) |
| `data/campaign_finance/ny/disclosures/data.parquet` | ~297 MB | ❌ gitignored | ✅ |
| `data/campaign_finance/fec/committees.parquet` | ~3 MB | ❌ | ✅ |
| `data/campaign_finance/fec/indiv_2024.parquet` | ~666 MB | ❌ | ✅ |
| `data/campaign_finance/fec/indiv_2026.parquet` | ~265 MB | ❌ | ✅ |
| `data/voter_records/ny/voters.parquet` | ~623 MB | ❌ | later (voter set) |
| `data/voter_records/ny/voting_history.parquet` | ~417 MB | ❌ | later |

The authoritative list is [`scripts/data-manifest.mjs`](../scripts/data-manifest.mjs).
Each entry's key is **both** the object path in the bucket **and** the path under
local `data/` — a 1:1 mapping keeps upload and seed in lockstep.

## Bucket

- Project: `heypcbktgbpxppkqfrax` (Engage Development)
- Bucket: **`engage-data`** — public, per-file size limit ≥ largest file
- Object layout mirrors `data/`, e.g. `campaign_finance/fec/indiv_2024.parquet`

## Env vars

| Var | Where | Secret |
|-----|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env`, Railway | no (build-time + runtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | local `.env` for upload only | **yes** — do NOT deploy/commit |

The seed script only needs `NEXT_PUBLIC_SUPABASE_URL` (public bucket). Uploading needs
the service role key.

## One-time: upload the files

1. In the Supabase dashboard → **Storage → Settings**, raise **Upload file size
   limit** above the largest file (e.g. 1 GB). Resumable uploads still respect this.
2. Put the service key in `.env`: `SUPABASE_SERVICE_ROLE_KEY=…`
   (Settings → API → `service_role`).
3. Run: `npm run data:upload` (campaign-finance set) — creates the bucket if needed
   and uploads via the resumable protocol; idempotent (skips same-size objects).
   Run `npm run data:upload:voters` to also push the voter files.

## Production (Railway)

- Attach a persistent volume mounted at `/app/data`.
- Set `NEXT_PUBLIC_SUPABASE_URL` (and the usual app env) in the Railway service.
- `npm start` runs `node scripts/seed-volume.mjs && next start`: the seed step
  downloads any missing manifest files into the volume, skips those already present
  (so restarts are cheap), and self-heals if the volume is wiped. It no-ops off
  Railway, so dev is unaffected.
