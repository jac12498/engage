# Database environments (dev / prod)

As of 2026-08-22 the app uses **two separate Supabase Postgres projects**. Before this,
local dev and production shared one database, so "dev" migrations landed on prod — don't
go back to that.

| | Production | Development |
|---|---|---|
| Supabase ref | `heypcbktgbpxppkqfrax` | `wkjelsyxeeflslibuinq` |
| Region | us-west-1 | us-east-2 |
| Pooler host | `aws-1-us-west-1.pooler.supabase.com` | `aws-0-us-east-2.pooler.supabase.com` |
| `DATABASE_URL` | prod, port `6543` (transaction) | dev, port `6543` |
| `DIRECT_URL` | prod, port `5432` (session) | dev, port `5432` |
| Configured in | **Railway** service env vars | local **`.env`** |

Both use the non-default **`engagecampaign`** schema (set via `@@schema` in
`schema.prisma`; `search_path` is set in `src/lib/prisma.ts`).

## Getting connection strings

Supabase dashboard → the project → top-bar **Connect** button → **ORMs → Prisma** tab.
Copy `DATABASE_URL` and `DIRECT_URL` **verbatim** (only fill in the DB password) — hand-
editing a project ref into a string with the wrong region host yields
`tenant/user … not found`. The DB password can be reset at Settings → Database.

`NEXT_PUBLIC_SUPABASE_URL` and the `sb_publishable_…` / `sb_secret_…` keys are per-project
but **not used by the running app** (Postgres via Prisma/pg; auth is NextAuth; reference
parquets are read from the local filesystem). Only `npm run data:upload` uses the secret
key (to push parquets to a Storage bucket).

## Viewing tables in the dashboard

The Table Editor / SQL Editor default to the `public` schema, which is empty. Switch the
**schema dropdown to `engagecampaign`**, or qualify queries:
`select * from engagecampaign."User";`

## Standing up / refreshing the dev DB

```bash
# .env must point at the dev project first
npx prisma db push                                   # build schema from schema.prisma
npx prisma db execute --file prisma/migrations/add-rbac.sql   # seed permissions + built-in roles
```

Dev starts empty (0 users); sign in locally to create a User + onboard a committee. To
make a dev account a system admin, set `User.isSystemAdmin = true` after first sign-in.

## Shared `public` reference tables (districts)

EngageCampaign reads the district hierarchy from `public.districts` +
`public.district_types` cross-schema (see `src/lib/districts.ts`). **Production
shares one Supabase project with the version10.3 app** (ref
`heypcbktgbpxppkqfrax`), so prod gets those tables for free. The **dev** project is
built by `prisma db push`, which only creates the `engagecampaign` schema — so the
`public` district tables are absent and the district picker (`/candidates/new`)
fails with `relation "public.districts" does not exist`.

Copy them from the source db (version10.3 = prod) into dev:

```bash
node scripts/dev/copy-public-districts.mjs
```

The script is read-only on the source and guarded so it can only ever write to the
known dev ref. Re-run it whenever you rebuild the dev db.

## Migration discipline (important)

1. Apply every new migration to **dev first** — `prisma db push` for schema changes, or
   `prisma db execute --file <sql>` for hand-written idempotent SQL.
2. Verify on dev.
3. Then apply the **same** change to prod (against Railway's DB).

**Never run migrations straight at production.** (Prisma 7 `db execute` reads its
datasource from `prisma.config.ts`, i.e. the current `DATABASE_URL` — there is no
`--url` / `--schema` flag.)

Also: **deleting a committee can strand any live session** whose token points at it (the
app falls back gracefully now, but the user may need to reload / re-sign-in). Prefer doing
such deletions during quiet periods.
