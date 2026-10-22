# Website-Builder Reconstruction Plan

> **Status (2026-10-22):** Recovery complete and manually walked through — accepted as the
> **Basic Website Builder implementation**. Replayed in `ea4f222` and briefly merged to
> `master`, which auto-deployed to production before prod had the two new tables, so it was
> reverted on `master` (`19c3ab7`) and lived on `recover/website-builder` / the dev DB.
> To ship: apply the two migrations to prod, then `git revert 19c3ab7` on `master`, then
> push. Next: a more visual builder (see the README roadmap).

Recovering EngageCampaign work lost in the 2026-09 D-drive crash. Written 2026-09-08.

## Situation

The drive died with work committed only as far as **`36c64bc`** ("Communications:
committee-oriented grounding + AI Assistant (v1.6)", 2026-08-25T13:33Z, pushed 13:36Z).
The repo was re-cloned from `github.com/jac12498/engage` and is intact to that commit.

Lost from disk: the website-builder redesign (phases A-E) built on 2026-08-25 (afternoon)
and 2026-08-28. That work was never committed. It is reconstructible from the Claude Code
session transcript, which lived on C: and survived.

## Source of truth

```
C:\Users\<you>\.claude\projects\d--OneDegree-version10-3\<session-id>.jsonl
```

45 MB JSONL. Each `tool_use` block of type `Write` carries the complete file content in
`input.content`; each `Edit` carries `input.old_string` / `input.new_string`. Replaying them
in `timestamp` order on top of `36c64bc` reproduces the lost tree.

**Cutoff: `timestamp > "2026-08-25T13:33"`.** Anything at or before that is already in
`36c64bc` — do not replay it or you will double-apply.

## Preconditions (verified 2026-09-08)

Checked against the transcript and the `36c64bc` tree. All clean:

- **29 files** in the gap — 15 new, 14 modified. 16 Writes + 98 Edits = **114 ops**.
- **0 failed ops.** Every `tool_use` has a matching non-error `tool_result`, so nothing must
  be skipped on replay.
- **0 sidechain ops** — no subagent edits, so there is one linear timeline, no dedup needed.
- **0 `replace_all` edits** — every Edit is a single unambiguous occurrence.
- **Every one of the 15 new files has a full `Write`.** No file has to be inferred from
  edits alone.
- **Every edit-only file exists in `36c64bc`.** No missing base.
- **No dependency or filesystem drift.** The only shell commands in the window that touch
  state are two `npx prisma generate` runs (derived output, not source). No `npm install`,
  no `rm`, no `mv`, no renames — so `package.json` and `package-lock.json` are unchanged
  and need no recovery.

## Procedure

1. **Branch off the base**, never work on `master`:
   ```
   git -C D:\EngageCampaign checkout -b recover/website-builder 36c64bc
   ```

2. **Write a replay script** (Python, to the scratchpad — not the repo). It should:
   - stream the JSONL, keep entries whose `timestamp > "2026-08-25T13:33"`;
   - keep `tool_use` blocks where `name` is `Write` or `Edit` and `input.file_path`
     contains `EngageCampaign`;
   - sort by `timestamp`, then by original line order for ties (several ops share a
     minute — line order is the real sequence);
   - for `Write`: create parent dirs, write `input.content` verbatim;
   - for `Edit`: read the file, assert `old_string` occurs **exactly once**, replace it
     with `new_string`, write back;
   - **abort loudly** on any `old_string` that is missing or ambiguous rather than
     guessing — a mismatch means the ordering assumption broke and needs a look.

3. **Dry-run first.** Run against a scratch copy of the tree and report per-file op counts
   and any mismatches. Expect 114 applied, 0 mismatched. Only then run against the repo.

4. **Regenerate derived output:**
   ```
   npx prisma generate
   ```

5. **Do NOT run the two website-builder migrations against dev. They are already applied.**

   - `prisma/migrations/20260828120000_add_site_template/migration.sql`
   - `prisma/migrations/20260828130000_add_website_image/migration.sql`

   **Verified 2026-09-11** against the DEV project (`<DEV_DB_REF>`, us-east-2) by
   querying `engagecampaign._prisma_migrations` directly:

   - local migration files: **7**
   - applied in the dev database: **9** — the 7 plus both of the above, each `finished_at`
     non-null
   - the tables physically exist, not just the migration records:
     - `SiteTemplate` — id, committeeId, name, description, appliesTo, source, prototype,
       createdBy, createdAt, updatedAt
     - `WebsiteImage` — id, committeeId, data, mime, alt, sourceUrl, createdAt

   So the replay only has to restore the migration **files** so local matches the database.
   Once the files exist, the `_prisma_migrations` rows already line up — no `migrate deploy`,
   no `migrate resolve`, no DDL.

   **`prisma migrate status` is not a safe check here.** It reports *"Database schema is up
   to date!"* because it only looks for local migrations that are pending. It says nothing
   about migrations applied in the database with no local file, which is exactly the drift
   that exists right now. Query `_prisma_migrations` directly instead.

   **Until the replay lands, do not author migrations against dev.** `prisma/schema.prisma`
   is at the `36c64bc` state and has no `SiteTemplate` or `WebsiteImage` models, while the
   dev database has both tables. The shadow-free authoring flow
   (`prisma migrate diff --from-config-datasource --to-schema ...`) will see those tables as
   unexpected and generate DROP statements.

   **PRODUCTION has not been checked.** Only dev was verified. The website-builder work was
   never committed, so prod (`<PROD_DB_REF>`) almost certainly does *not* have these
   tables — meaning that when this eventually merges and deploys, prod **will** need both
   migrations run for real. Confirm against prod's `_prisma_migrations` before deploying.
   (Per the database notes, Jeff runs prod migration steps himself.)

## Verification

- `npx tsc --noEmit` and `npm run lint` must be clean.
- `npm run build` must succeed.
- Walk the actual feature in the running app: structured builder, per-section AI,
  scaffold-vs-scratch, page manager, block palette, template save/apply, and the
  import-a-website path (`crawl.ts` -> `importSite.ts` -> `imageStore.ts`).
- `git diff 36c64bc --stat` should show ~29 files and no stray edits outside the
  website-builder surface.

Only merge to `master` after the build and a manual walkthrough both pass.

## Files in the gap

New (full `Write` available):

```
prisma/migrations/20260828120000_add_site_template/migration.sql
prisma/migrations/20260828130000_add_website_image/migration.sql
src/app/api/website/image/[id]/route.ts
src/app/website/(app)/templates/page.tsx
src/app/website/ai-actions.ts
src/app/website/import-actions.ts
src/components/website/BlockPalette.tsx
src/components/website/PageManager.tsx
src/components/website/TemplatesManager.tsx
src/lib/website/aiActions.ts
src/lib/website/crawl.ts
src/lib/website/imageStore.ts
src/lib/website/importSite.ts
src/lib/website/prototype.ts
src/lib/website/templates.ts
```

Modified (replay edits onto the committed version):

```
prisma/schema.prisma
src/app/api/communications/reference/website/route.ts
src/app/website/actions.ts
src/app/website/blocks-actions.ts
src/app/websites/[campaignId]/_render/blocks.tsx
src/components/website/BlockPropsForm.tsx
src/components/website/CreateSitePanel.tsx   (full Write, then 2 edits)
src/components/website/WebsiteAgent.tsx
src/components/website/WebsiteBuilder.tsx    (18 edits — the largest)
src/components/website/WebsiteWorkspace.tsx
src/lib/website/agentTools.ts
src/lib/website/blockService.ts
src/lib/website/blocks.ts                    (21 edits — the largest)
src/lib/website/generate.ts
```

## Out of scope

Tracked separately, not part of this reconstruction:

- **`.env` is gone in every repo** (gitignored). Secrets are recoverable from Railway
  production: project *Engage Amplify* / service `engage` is this app. Needs a permission
  rule for `railway variable list`.

  **EngageCampaign's dev database vars were restored 2026-09-11** and both verified
  connecting: `DATABASE_URL` (transaction pooler, `:6543`, `pgbouncer=true&connection_limit=5`)
  and `DIRECT_URL` (session pooler, `:5432`, `?schema=engagecampaign`), both pointing at the
  DEV project. The old password was stale and was reset in the Supabase dashboard. Note: after
  a reset the session pooler accepts the new password immediately while the **transaction
  pooler lags** by a minute or two and returns `28P01` in the meantime — retry before
  assuming the string is wrong. Still unset locally: `AUTH_SECRET`, `AUTH_URL`,
  `ANTHROPIC_API_KEY`, Resend and Google Maps keys.
- **`node_modules`** — plain `npm install`.
- **Gitignored data** — voter/OpenAddresses/comptroller parquets. Campaign-finance set is
  in the Supabase `engage-data` bucket; OneDegree voter and geocoding parquets may need
  rebuilding from source.
- **`D:\EngageAmplify` and `D:\TrumpCoinTracker`** — never pushed anywhere, gone. Amplify
  was already merged into this app, so the loss is the archived standalone only.
