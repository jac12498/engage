# Merge Marketing + Dashboard into One App — Migration Plan

**Status:** 📋 Plan for approval (2026-07-30). No code changes yet.
**Goal:** One Next app serving the public marketing site **and** the authenticated
dashboard, on one domain, one brand.

## Decisions (locked with Jeff)
- **Merge INTO `D:\EngageCampaign`** — it has the real app + DB. EngageAmplify becomes
  the source of *marketing content to port*, then is retired.
- **Brand = "Engage"** (wordmark). **Domain = engageamplify.com** (owned; already the
  newsletter sending domain). Name ≠ domain is fine; "Amplify" survives as a light
  descriptor. (Exact-match "Engage" domains are mostly taken; `tryengage.com` is the only
  likely-open option — verify at a registrar if an exact match is wanted.)
- **App is path-based at `/dashboard`**; marketing lives at `/`.
- **Stacks are identical** — both Next 16.2.9, React 19.2.4, next-auth 5, Tailwind v4
  (CSS-based), Prisma 7. No version/upgrade work. This is a content port + restructure.

## The core structural change
Today `/` **is** the authenticated workspace launcher (`src/app/page.tsx`). After the
merge, `/` = the public marketing home and the launcher moves to `/dashboard`. That flip
touches every "go home" path (post-login redirect, onboarding redirect, "Back to
workspace" links, `revalidatePath("/")`, the app header logo). Handled cleanly with Next
**route groups**.

## Target structure
```
src/app/
  (marketing)/               NEW — public group, static, its own header/footer
    layout.tsx               marketing chrome; NO auth
    page.tsx                 marketing home (ported from EngageAmplify /)
    platform/
      ai-communications/  candidate-websites/  newsletter/ (NEW pillar)
      voter-outreach/  fundraising/  field-tools/
    pricing/  about/  (whatever EngageAmplify has)
  dashboard/
    page.tsx                 the current app/page.tsx WorkspacePage (moved here)
  communications/  website/  newsletters/  contacts/  settings/   (unchanged URLs)
  websites/[campaignId]/     public published candidate sites — UNCHANGED, stay public
  newsletter/confirm|unsubscribe   public token routes — UNCHANGED, stay public
  sign-in/  onboarding/  verify-request/   auth flow
  api/                       shared (EngageCampaign's own — keep)
```
Route groups add no URL segment, so `(marketing)/page.tsx` serves `/` and
`(marketing)/platform/x` serves `/platform/x`. The existing module routes keep their URLs
and their per-layout auth; only the launcher relocates.

## Take only marketing from EngageAmplify — DISCARD:
- `prisma/`, `prisma.config.ts`, `api/auth`, `api/generate`, `api/print` (EngageCampaign's
  own auth/DB/APIs win — do NOT import a second auth/DB)
- `src/app/_archive/*`
**Port:** marketing pages, their components, `public/` assets, design tokens (globals.css),
and copy.

## Phased sequence
**Phase A — Restructure skeleton** (no marketing visuals yet)
1. Add `app/(marketing)/layout.tsx` + a placeholder `app/(marketing)/page.tsx`.
2. Move `app/page.tsx` → `app/dashboard/page.tsx`.
3. Repoint every `/` → `/dashboard`: post-login redirect, onboarding redirect,
   `NewslettersManager` "Back to workspace", `revalidatePath("/")` in settings, AppHeader
   logo link, any other `redirect("/")` / `href="/"`. (grep sweep: `href="/"`,
   `redirect("/")`, `revalidatePath("/")`, `router.push("/")`.)
4. Brand rename: AppHeader "Engage Campaign" → "Engage"; root `layout.tsx` metadata/title.
5. Build green + tsc clean. App fully usable at `/dashboard`; `/` is a placeholder.

**Phase B — Port marketing content**
6. Port marketing home + `platform/*` pillars; ADD a `newsletter` pillar (module now exists
   as a standalone — keep the pillar list in sync with `MODULES`).
7. Port marketing components + `public/` assets.
8. Reconcile design tokens in `globals.css` — one system (app palette `#1b3a6b` navy /
   `#c4910a` gold) so marketing↔app has no visible seam.
9. Marketing→app CTAs ("Get started"/"Sign in") → `/sign-in` → onboarding → `/dashboard`.
   Logged-in visitors to `/` see "Go to dashboard".
10. SEO: metadata, `sitemap.ts`, `robots`, OG images for marketing.

**Phase C — Domain/auth/env consolidation + deploy**
11. `AUTH_URL` → `https://engageamplify.com`; NextAuth callbacks; verify magic-link flow.
12. (Optional, separate) move transactional email `mail.engage.democrat` →
    `mail.engageamplify.com` to fully consolidate the brand.
13. Deploy (single Railway service).

## Risks / watch-items
- **The `/` → `/dashboard` link sweep** is the highest-ripple step — do it by grep, verify none missed.
- **Design-token collision** merging two Tailwind v4 themes in globals.css.
- **Windows file locks** during moves (already hit once) — stop the dev server for Phase A moves.
- **Do not** import EngageAmplify's auth/prisma.
- Keep **public routes reachable**: `/websites/[campaignId]/*` and `/newsletter/{confirm,unsubscribe}`
  must not fall under the marketing or app auth layouts.

## Resolved sub-decisions (2026-07-30)
- **Domain: engageamplify.com** — keep it (not acquiring an exact-match "Engage" domain).
- **Transactional email: move `mail.engage.democrat` → `mail.engageamplify.com`** — approved,
  done later (Phase C / after), as suggested.
- Global middleware vs. per-layout auth for `/dashboard` + modules (lean: keep per-layout).

**Jeff approved the plan 2026-07-30. Phase A in progress.**
