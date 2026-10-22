# EngageCampaign deploy checklist (Railway)

Status: **getting deploy-ready** — not yet deployed. Detail for the data layer lives
in [STORAGE_SETUP.md](./STORAGE_SETUP.md).

## Data files (Supabase Storage → Railway volume)

DuckDB reads large parquets from the local filesystem; prod hydrates them onto a
Railway volume on boot from the `engage-data` Supabase Storage bucket. See
[STORAGE_SETUP.md](./STORAGE_SETUP.md).

- [x] Storage plumbing in place — `scripts/data-manifest.mjs`, `scripts/seed-volume.mjs`,
      `scripts/upload-data-to-storage.mjs`, `start` = `seed-volume && next start`,
      `data:upload` npm script, deps (`@supabase/supabase-js`, `tus-js-client`).
- [x] **Campaign-finance set uploaded** to `engage-data` and verified (2026-08-20):
      `ny/disclosures/data.parquet`, `fec/committees.parquet`, `fec/indiv_2024.parquet`,
      `fec/indiv_2026.parquet`.
- [ ] **Raise Storage upload size limit** (Supabase → Storage → Settings) above the
      biggest file (~1 GB) BEFORE any large `data:upload` — default 50 MB rejects the
      parquets. (Already done for the campaign-finance upload; re-check if the project
      is reset.)
- [x] **Voter file set IN SCOPE** (Contacts→voter linking) — `VOTER_FILES` added to
      `SEED_FILES` in `scripts/data-manifest.mjs`; `npm run data:upload:voters`
      uploads `voter_records/ny/voters.parquet` (623 MB) + `voting_history.parquet`
      (417 MB). These are the only voter files read at runtime (`lib/voters.ts`).
- [ ] To refresh a data file: regenerate locally (`finance:generate-fec` /
      `voters:convert-ny`) → `npm run data:upload` (idempotent; re-uploads changed sizes)
      → redeploy or wipe the volume so the seed re-pulls.

## Railway service

- [ ] Attach a **persistent volume mounted at `/app/data`** (= `process.cwd()/data`).
      Required — the seed step writes here and DuckDB reads from here.
- [ ] Confirm the small NY committee registry `data/campaign_finance/ny/committees.parquet`
      ships in the image (it's committed to git), so onboarding lookup works even
      before the volume seeds.
- [ ] Verify first boot logs `[seed-volume] downloading …` then `complete`; subsequent
      boots log `exists …` (cheap skip).

## Environment variables (Railway)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://<PROD_DB_REF>.supabase.co`
      (public; needed by seed-volume at boot and build).
- [ ] **Do NOT set `SUPABASE_SERVICE_ROLE_KEY` in Railway** — it's for local
      `data:upload` only. The public bucket needs no key to download.
- [ ] App env: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL` (= prod URL),
      `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`,
      `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

## Database

- [ ] Apply migrations to the prod DB before/at deploy (hand-written SQL under
      `prisma/migrations/` via `prisma db execute`, then `prisma generate`).
- [ ] **Website builder:** confirm prod's `engagecampaign._prisma_migrations` has
      `20260828120000_add_site_template` and `20260828130000_add_website_image` (both
      only create tables: `SiteTemplate`, `WebsiteImage`). Apply them to prod BEFORE
      deploying the builder code.
