# Candidate Website — Phase 1 Spec: Page/Block Model

**Status:** ✅ **COMPLETE — Phase 1 (Steps 1A–1E) DONE** (2026-07-10) · Next: Phase 2 (conversational builder) · **Author:** Jeff + Claude
**Goal of Phase 1:** replace the fixed-column, single-page website with a composable
**Page → Block** content model and multi-page rendering — the foundation the
conversational builder (Phase 2) and custom domains (Phase 3) both require.

> **Progress log**
> - **2026-07-08 — Step 1A complete & verified.** `Page`/`Block` models added to
>   `schema.prisma` (additive; legacy columns + `WebsiteIssue` retained, marked LEGACY).
>   Migration `prisma/migrations/add-pages-blocks.sql` applied (tables live in the
>   `engagecampaign` schema). Backfill `scripts/backfill-website-blocks.ts` run — the
>   `jeff-collins` site now has a Home page of 4 blocks (hero / richText / issuesGrid×3 /
>   volunteerForm), donate CTA + headshot flag preserved. Prisma client regenerated;
>   `tsc --noEmit` clean; app unchanged (nothing reads the new tables yet).
> - **2026-07-10 — Step 1B complete & verified.** Pure block registry
>   `src/lib/website/blocks.ts` (9 block types: prop interfaces, `defaultProps`,
>   per-type `validate` sanitizers, `BLOCK_ORDER`, `validateBlock`, `WEBSITE_NEWS_TYPES`) —
>   deliberately React-free so the Step 1C editor + Phase 2 AI tools can import it.
>   Render components live separately under `src/app/websites/[campaignId]/_render/`
>   (`site.ts` loader + `FONT_STACK` + `paragraphs`, `blocks.tsx` = one component per type
>   + `BlockRenderer` dispatcher that RE-validates stored JSON on render, `PublicSite.tsx`
>   = themed chrome). Public routes now render from Page/Block: `page.tsx` (home = isHome
>   page), new `[pageSlug]/page.tsx`, new `news/[generationId]/page.tsx` (newsFeed detail).
>   Theme via CSS vars `--site-primary`/`--site-accent` on the wrapper. Old hardcoded
>   section markup deleted. `newsFeed` queries published `Generation`s (allowlisted types).
>   `tsc` clean; `npm run build` green (24 routes); verified the backfilled jeff-collins
>   Home page (4 known blocks, all validate ok, site published).
> - **2026-07-10 — Steps 1C + 1D complete & verified.** Done together because retiring
>   `updateSite` + switching the builder to blocks while generation still wrote dead legacy
>   columns would ship a broken "Create site"/"Regenerate". **1C:** `src/lib/website/sanitize.ts`
>   (extracted `safeColor`/`safeFont`/`safeUrl`/`safeStr`/`safeEmail`, shared by both action files);
>   `src/app/website/blocks-actions.ts` — ownership-checked (`block→page→website→campaignId`)
>   `createPage`/`updatePage`/`deletePage`(reject isHome)/`reorderPages`, `addBlock`(seeds
>   `defaultProps`, renumbers)/`updateBlockProps`(→`validateBlock`)/`moveBlock`(reorder or
>   cross-page)/`deleteBlock`, `updateSiteSettings`(theme+links); all `revalidatePath("/website")`
>   + `/websites/{id}`. Rebuilt `WebsiteBuilder.tsx` as page-list + selected-page block editor
>   (structural ops render from the server `site` prop + `router.refresh()`; only the settings
>   card and per-block forms hold local state), new `BlockPropsForm.tsx` (type-specific forms for
>   all 9 blocks + reusable ItemList/CtaField). `updateSite`/`SiteInput` removed. **1D:**
>   `src/lib/website/draftToBlocks.ts` (`draftToHomeBlocks` maps a `WebsiteDraft` → hero/richText/
>   issuesGrid/volunteerForm, each run through the block validator); `generateSite`/`regenerateSite`
>   now write Page/Block (regenerate replaces only the Home page's blocks). `tsc` clean; build green
>   (24 routes). **CWD LESSON:** the Bash cwd silently reset to version10.3 mid-session — a bare
>   `npm run build` built the wrong app and reported false-green; always `cd /d/EngageCampaign` in the
>   same command and confirm the route list shows `/communications`+`/website`, not `/mycanvass`.
> - **2026-07-10 — Step 1E complete & verified. Phase 1 is DONE.** Migration
>   `prisma/migrations/drop-legacy-website-columns.sql` (dropped the six Website copy columns +
>   the `WebsiteIssue` table; idempotent, `DROP … IF EXISTS`) applied via `npx prisma db execute`.
>   Removed the columns + relation + `WebsiteIssue` model from `schema.prisma`; `prisma generate`.
>   Deleted the spent `scripts/backfill-website-blocks.ts` (it read the dropped columns and is
>   covered by tsc `**/*.ts`; its migration is done + in git history). `WebsiteDraft` in
>   `generate.ts` keeps those field NAMES — it's the AI-output intermediate consumed by
>   `draftToBlocks`, not a DB mapping. `tsc` clean; build green (24 routes). DB verified: 0 legacy
>   columns remain, `WebsiteIssue` gone, Page/Block data intact (jeff-collins: Home 4 blocks +
>   an Issues page Jeff added while testing the 1C editor). **Next: Phase 2** — conversational
>   builder (agent loop over the block CRUD actions as tools, live preview, `websiteEditsThisMonth`
>   metering, tiered model/limits).
> - ~~**Next: Step 1E** — once nothing references them, drop the six copy columns on `Website` +~~
>   the `WebsiteIssue` table (migration `drop-legacy-website-columns.sql`) and remove them from
>   `page.tsx` selects / the `generate.ts` `WebsiteDraft` conceptual mapping. (Legacy columns are
>   now WRITE-DEAD — nothing writes or reads them post-1C/1D — so 1E is purely cleanup.)

Phase 1 explicitly does **not** include: the AI chat builder, subdomains, or custom
domains. But every piece here is shaped so those slot in without rework — the block
CRUD actions built here are exactly the tools the Phase 2 agent will call.

---

## 1. Where we are today (the constraint)

- `Website` stores content as literal columns: `heroHeadline`, `heroSubhead`,
  `aboutHeading`, `aboutBody`, `issuesIntro`, `volunteerIntro` + a `WebsiteIssue[]`.
- The public page ([`src/app/websites/[campaignId]/page.tsx`](../src/app/websites/[campaignId]/page.tsx))
  is one hardcoded template with anchor sections.
- Generation ([`src/lib/website/generate.ts`](../src/lib/website/generate.ts)) does one
  JSON dump into those columns. The builder ([`WebsiteBuilder.tsx`](../src/components/website/WebsiteBuilder.tsx))
  is a fixed form over the same columns.

"Add a page" and "let AI restructure the site" are both impossible because *page* and
*section* aren't concepts — there are only four text fields.

---

## 2. Target data model

`Website` stays as the **site-level container** (theme, publish switch, slug, site-wide
links). Content moves into `Page` and `Block`.

```prisma
model Website {
  id           String   @id @default(cuid())
  campaignId   String   @unique
  campaign     Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  slug         String   @unique          // site handle (subdomain later); kept
  published    Boolean  @default(false)  // master on/off for the whole site

  // Theme — rendered as CSS variables, never touched by AI content
  primaryColor String   @default("#1b3a6b")
  accentColor  String   @default("#c4910a")
  fontTheme    String   @default("classic")
  headshotData Bytes?
  headshotMime String?

  // Site-wide links (used in nav + footer)
  donateUrl    String?
  contactEmail String?

  pages   Page[]
  signups VolunteerSignup[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@schema("engagecampaign")
}

model Page {
  id        String  @id @default(cuid())
  websiteId String
  website   Website @relation(fields: [websiteId], references: [id], onDelete: Cascade)

  slug      String  // path segment; "home" is the root page. Unique per website.
  title     String  // nav label + <title>
  navOrder  Int     @default(0)     // order in the nav bar
  showInNav Boolean @default(true)
  published Boolean @default(true)   // draft a page without unpublishing the site
  isHome    Boolean @default(false)  // exactly one per site; undeletable; served at root

  blocks    Block[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([websiteId, slug])
  @@index([websiteId])
  @@schema("engagecampaign")
}

model Block {
  id      String @id @default(cuid())
  pageId  String
  page    Page   @relation(fields: [pageId], references: [id], onDelete: Cascade)

  type    String // one of the v1 vocabulary (see §3); validated on write
  order   Int    @default(0)
  props   Json   // typed, validated per-type payload (see §3)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([pageId])
  @@schema("engagecampaign")
}
```

**Retired:** the six copy columns on `Website` and the entire `WebsiteIssue` model.
They are kept temporarily during migration (Step 1A) and dropped in Step 1E once
nothing reads them. `VolunteerSignup` is unchanged (still FK → `Website`).

---

## 3. Block vocabulary (v1)

A **closed** set. Each type has a validator and a renderer component; the two live
together in one registry (`src/lib/website/blocks.ts`) so the renderer, the editor
palette, and the Phase 2 AI tool schema all read from a single source of truth.

Nine blocks, locked. Four are **core** (seeded on every generated site); the rest are
**optional** (in the palette, added as needed). Principle: keep the grammar small and make
`richText` the flexible workhorse rather than adding a block for every niche section.

| type | tier | purpose | props |
|---|---|---|---|
| `hero` | core | page header / banner | `{ headline, subhead?, showHeadshot?: bool, primaryCta?: {label, href}, secondaryCta?: {label, href} }` |
| `richText` | core | prose section (About + any custom section) — the escape hatch | `{ heading?, body, cta?: {label, href} }` — body = plain text, blank-line-split into paragraphs (no HTML/markdown parser → no XSS) |
| `issuesGrid` | core | issue cards ("Where I stand") | `{ heading?, intro?, items: [{ title, body }] }` (≤12) |
| `volunteerForm` | core | the existing volunteer signup form | `{ heading?, intro? }` |
| `cta` | optional | standalone action band (Donate / Chip in / RSVP) | `{ heading?, text?, buttonLabel, href }` |
| `endorsements` | optional | endorsement / quote cards (credibility) | `{ heading?, intro?, items: [{ name, role?, quote? }] }` (≤24) |
| `newsFeed` | optional | **dynamic** — surfaces published AI-Comms pieces (see below) | `{ heading?, intro?, types: string[], limit?: number }` |
| `events` | optional | upcoming events | `{ heading?, intro?, items: [{ title, date?, location?, description? }] }` (≤24) |
| `faq` | optional | Q&A list | `{ heading?, intro?, items: [{ q, a }] }` (≤24) |

**`newsFeed` — cross-module integration (the sticky one).** Unlike every other block, its
content isn't static `props` — it *queries* the campaign's `Generation` rows and renders the
ones the candidate has curated onto the site. This keeps the site fresh automatically as the
candidate uses AI Communications, and makes the Comms subscription visibly more valuable.
Rules:
- Show only `Generation.published === true` **and** `type ∈ props.types`, where `types` is an
  allowlist of website-appropriate formats (default `["press_release", "statement", "op_ed"]`
  — **never** fundraising emails or social posts). The existing `published` flag is the
  "show on site" curation signal; no new schema needed for v1.
- Renders newest-first, up to `limit` (default 5): title + date + first paragraph, linking to
  a public detail page **`/websites/[campaignId]/news/[generationId]`** that shows the full
  published content (404 unless that generation is published + an allowed type). This detail
  route is the one net-new public surface `newsFeed` adds.

**Deferred (later phase):** `contact` (footer already carries "Paid for by" + contact email —
add only when a dedicated Contact *page* is needed), `gallery`/`video` (need image-upload /
embed infra like the headshot route).

### Prop validation

Every `type` gets a `validateProps(raw): Props` that runs on **every write** (create,
manual edit, and Phase 2 AI edit). Reuse the existing sanitizers from
[`actions.ts`](../src/app/website/actions.ts): `safeStr`, `safeUrl` (http(s) only —
blocks `javascript:`/`data:`), plus per-type length/count clamps. Unknown keys are
dropped; unknown `type` is rejected. This is the security boundary that lets AABI/candidate
input drive public pages safely.

```ts
// src/lib/website/blocks.ts — shape
export interface BlockSpec<P> {
  type: string
  label: string                       // editor palette label
  description: string                 // used in editor + AI tool schema
  defaultProps: () => P               // for "add block"
  validate: (raw: unknown) => P       // clamp + sanitize on write
  Render: React.FC<{ props: P; ctx: RenderCtx }>  // ctx = { campaign, site, campaignId }
}
export const BLOCK_SPECS: Record<string, BlockSpec<any>>
export const BLOCK_ORDER: string[]    // palette display order
```

---

## 4. Rendering

### Registry-driven renderer
`src/app/websites/[campaignId]/_render/` holds one component per block type. The page
renderer walks `blocks` ordered by `order`, looks up `BLOCK_SPECS[type].Render`, and
renders it. Unknown type → skip (defensive).

### Public routes
- `/websites/[campaignId]` → the `isHome` page.
- `/websites/[campaignId]/[pageSlug]` → that page (404 if missing/unpublished).
- Both `notFound()` when `site.published === false`.
- Shared chrome (`layout` for the public site): sticky nav derived from published,
  `showInNav` pages ordered by `navOrder`, + a Donate button when `site.donateUrl` set;
  footer with the "Paid for by…" disclaimer (unchanged logic).

### Theme as CSS variables
The public layout sets `--site-primary`, `--site-accent`, and the font stack on a
wrapper element; block components consume those. This keeps look-and-feel entirely in
the theme system so (a) AI never emits styling and (b) re-theming is free. Migrate the
current inline-style approach to variables during Step 1B.

---

## 5. Server actions (block CRUD)

New file `src/app/website/blocks-actions.ts`. **Every action re-derives the campaign
from the session and verifies the target block/page belongs to that campaign's website**
(block → page → website → `campaignId`), then `revalidatePath("/website")` +
`revalidatePath("/websites/{campaignId}")`.

```
Pages:  createPage(title) · updatePage(id, {title,slug,navOrder,showInNav,published})
        deletePage(id)  (reject if isHome) · reorderPages(orderedIds[])
Blocks: addBlock(pageId, type, atIndex?)  (seeds defaultProps)
        updateBlockProps(blockId, rawProps)  (→ validate)
        moveBlock(blockId, toPageId?, toIndex) · deleteBlock(blockId)
Site:   setTheme({primaryColor,accentColor,fontTheme}) · setPublished(bool)  (kept)
```

These are the **same operations Phase 2's AI agent will invoke as tools** — building them
as clean, validated, ownership-checked functions now is the main leverage of Phase 1.
`slugify` + a per-website `uniquePageSlug` mirror the existing `uniqueSlug` helper.

The old `updateSite(SiteInput)` fixed-field action is retired in Step 1C.

---

## 6. Generation (minimal change in Phase 1)

Keep `generateWebsiteDraft()` producing today's `WebsiteDraft` shape — **do not** rebuild
generation as conversational yet (that's Phase 2). Add a pure mapper:

```ts
// src/lib/website/draftToBlocks.ts
draftToBlocks(draft, { donateUrl }): { pages: [{ slug, title, isHome, blocks: BlockInput[] }] }
```

For Phase 1 it emits a single Home page with: `hero` → `richText`(About) →
`issuesGrid` → `volunteerForm`. `generateSite`/`regenerateSite` call this and write
Pages/Blocks instead of columns. Regenerate overwrites AI-authored blocks on the Home
page but preserves theme, slug, site links, publish state, and any pages/blocks the user
added manually (only replace blocks that were AI-seeded — track with a `source` note or,
simpler for v1, only regenerate the Home page's blocks).

---

## 7. Editor UI (Phase 1 scope: deliberately minimal)

Because Phase 2's conversational builder becomes the primary editing surface, the Phase 1
manual editor should be **functional, not polished** — enough to prove the model and to
be a fallback. Replace `WebsiteBuilder` with:

- **Left:** page list (add page, select, reorder, delete non-home, publish toggle).
- **Center:** block list for the selected page — each block is a small typed form
  (fields from that type's props), with add-from-palette, reorder (↑/↓ is fine; skip
  drag-and-drop), and delete.
- **Top:** publish bar (site publish toggle, public URL, View live) + theme card
  (colors/font/headshot — reuse existing).
- **Right (optional):** live `<iframe>` preview of the selected page.

No new inline-editing niceties, no DnD library. Ship the mechanism.

---

## 8. Migration & rollout (keeps build green at each step)

**Step 1A — Schema + backfill (additive). ✅ DONE 2026-07-08.**
Add `Page`/`Block` models; keep old columns + `WebsiteIssue`. Migration
`prisma/migrations/add-pages-blocks.sql` (CREATE TABLE IF NOT EXISTS pattern; apply with
`npx prisma db execute --file prisma/migrations/add-pages-blocks.sql` — no `--schema`/`--url`
flags, per repo convention). Backfill script `scripts/backfill-website-blocks.ts` converts
each existing `Website` → one Home `Page` + blocks (hero/richText/issuesGrid/volunteerForm)
from its columns and `WebsiteIssue` rows. Nothing reads `Page` yet → build stays green.

**Step 1B — Renderer.** Build `BLOCK_SPECS` + block components + multi-page public routes
+ CSS-variable theming. Switch the public site to render from blocks. Delete the old
hardcoded section markup.

**Step 1C — Editor + actions.** Add `blocks-actions.ts`; rebuild the builder as the
page/block editor (§7). Retire `updateSite`.

**Step 1D — Generation mapping.** Add `draftToBlocks`; point `generateSite`/`regenerateSite`
at it.

**Step 1E — Cleanup.** Once nothing references them, drop the six copy columns on `Website`
and the `WebsiteIssue` table (migration `drop-legacy-website-columns.sql`). Update the
`page.tsx` `select`s.

---

## 9. Decisions to confirm before coding

1. **Phase 1 editor depth** — minimal manual editor now (recommended, since conversational
   is Phase 2), or invest more? See §7.
2. **richText format** — keep plain-text-paragraph convention (recommended: no parser, no
   XSS surface), or allow limited markdown later?
3. **Page slug on public URL** — `/websites/[campaignId]/[pageSlug]` in Phase 1 (fine, since
   custom domains are Phase 3), confirmed?
4. **Block vocabulary** — ✅ **Resolved (2026-07-08):** the 9-block set in §3 is locked —
   `hero`, `richText`, `issuesGrid`, `volunteerForm` (core) + `cta`, `endorsements`,
   `newsFeed`, `events`, `faq` (optional). `newsFeed` includes the AI-Comms integration and
   its `/news/[generationId]` detail route; `contact`/`gallery`/`video` deferred.

---

## 10. Out of scope (later phases)

- **Phase 2:** conversational builder — agent loop with the §5 actions as tools, live
  preview, per-message metering (`websiteEditsThisMonth`), tiered model/limits.
- **Phase 3:** subdomains → custom domains (`Domain` model, Host-based middleware routing,
  Railway custom-domain + SSL), gated to Campaign+.
- Image blocks / media library; per-page SEO/OG images; block-level versioning.
