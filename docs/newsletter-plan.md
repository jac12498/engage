# Newsletter — Status & Plan

**Status:** ✅ **Phase 1 (Subscribers / double opt-in) DONE** · ✅ **Phase 2 (Authoring + Archive) DONE + verified** (2026-07-19, build green, tsc clean) · ⏳ Phase 3 (Sending) planned · **Author:** Jeff + Claude

> ✅ **Committed 2026-07-30** as `a543b92` on `master` (one atomic commit alongside In-the-News
> and the conversational website builder — shared schema/block files made a clean per-feature
> split infeasible without non-building intermediate commits). The `add-newsletter-subscribers.sql`
> and `add-newsletters.sql` migrations were already applied to the `engagecampaign` Supabase schema.
> Not yet pushed to a remote.
>
> 📮 **Sending domain ready:** `news.engageamplify.com` (Cloudflare DNS, verified in Resend —
> DKIM + SPF + bounce MX + DMARC all live and DKIM-aligned). See Phase 3 below.

---

## Vision

A periodic email newsletter for a campaign. Four capabilities the candidate wants:
1. Visitors **subscribe** on the website.
2. A **history/archive** of past newsletters.
3. The candidate **creates/drafts** a newsletter.
4. On **publish**, a copy is **emailed** to subscribers.

It's a **cross-module** feature (same shape as `newsFeed` / `pressMentions`):

| Requirement | Home | Reuses |
|---|---|---|
| Subscribe | Candidate Website | Volunteer-form pattern (public block + unauthenticated route) |
| Archive | Candidate Website | The `news/[generationId]` public detail-route pattern |
| Create/draft | AI Communications | The generator, model picker, news grounding, refine history |
| Send on publish | **New capability** | Existing Resend account (bulk send ≠ transactional) |

**Phasing rationale:** do sending LAST — it's the piece with external dependencies (DNS,
domain verification, deliverability reputation), not just code. Phases 1–2 are useful on their
own (collect a list, publish a web archive) before any email goes out.

---

## Key decisions

- **Double opt-in** for signups (confirmation email) — keeps spam/typo addresses off the list
  and protects future deliverability. Non-negotiable given the signup form is public.
- **`NewsletterSubscriber` is its own model**, separate from `Contact` — a lightweight,
  compliance-bearing mailing list (unsubscribe tokens, status). Active subscribers may later
  also be surfaced as Contacts (`type: "subscriber"`), but the sending list stays separate.
- **Multi-tenant email (Resend):** one Resend account holds many campaigns' sending domains;
  each send uses that campaign's `from: news@theirdomain`. Each campaign verifies their own
  domain via Resend's **Domains API** (build a self-serve DNS flow in P3). Caveats: shared-IP
  reputation across tenants (dedicated IPs are higher-tier), per-plan domain/volume caps
  (re-verify current numbers before P3), send from a **subdomain** to isolate reputation.
- **Evaluate Resend Audiences + Broadcasts** in P3 vs. hand-rolling the list + batched sends —
  Broadcasts natively manages subscriber lists, unsubscribe, and bulk sends (offloads much of
  the compliance/deliverability burden).
- Existing Resend is already wired for magic-link sign-in (`src/lib/auth.ts`,
  `RESEND_API_KEY` + `EMAIL_FROM`).

---

## Phase 1 — Subscribers (DONE)

Subscriber capture with double opt-in. **No bulk sending yet** — only the transactional
confirmation email (reuses the same Resend path as magic links).

**Data — `NewsletterSubscriber`** (`engagecampaign` schema, in `prisma/schema.prisma`):
`email`, `name?`, `status` (pending | active | unsubscribed), `source`,
`confirmToken String? @unique` (cleared once confirmed → single-use),
`unsubscribeToken String @unique` (permanent; goes in every send footer),
`confirmedAt?`, `unsubscribedAt?`. `@@unique([campaignId, email])`, `@@index([campaignId, status])`.
Only `active` subscribers are ever mailed.
Migration: `prisma/migrations/add-newsletter-subscribers.sql` (idempotent) — **APPLIED**
via `npx prisma db execute --file …` (no `--schema`/`--url` flags; URL comes from
`prisma.config.ts`).

**Shared libs added:**
- `src/lib/email.ts` — `resend` client + `EMAIL_FROM` + `sendMail({to,subject,html})`.
  Separate instance from `auth.ts`, same key. Bulk-send (P3) layers on top.
- `src/lib/statusResponse.ts` — `statusResponse(title, msg, ok)` → a self-contained branded
  HTML `Response` for the public token pages (opened straight from an email).

**Block — `newsletterSignup`** (optional tier; sits after `volunteerForm` in `BLOCK_ORDER`):
props `{ heading?, intro?, buttonLabel? }`. Registered in `src/lib/website/blocks.ts`,
rendered by `src/app/websites/[campaignId]/_render/blocks.tsx` (`#newsletter` anchor via the
client `src/components/website/NewsletterSignupForm.tsx`, which mirrors `VolunteerForm` and
POSTs to `/api/website/subscribe`; success shows "check your email to confirm"). Editable in
`BlockPropsForm.tsx` and described in `agentTools.describeBlockVocabulary()` so the AI website
builder can place it.

**Public routes** (unauthenticated; the app has no global middleware):
- `POST /api/website/subscribe` — gate: the campaign's site must be `published`; email is
  lowercased; upserts a `pending` subscriber with a fresh `confirmToken`; **already-active →
  silent success** (no re-email); unsubscribed → re-subscribe; sends the confirmation email
  (returns 500 if that send fails). Base URL for links = `AUTH_URL || NEXTAUTH_URL || req origin`.
- `GET /newsletter/confirm?token=` (`src/app/newsletter/confirm/route.ts`) — flips
  `pending → active`, sets `confirmedAt`, clears `confirmToken` (single-use). Reused/bad token → 400 page.
- `GET /newsletter/unsubscribe?token=` — permanent `unsubscribeToken` → `unsubscribed`.

**Manager UI** — `/website/subscribers` (`src/app/website/(app)/subscribers/page.tsx` →
`src/components/website/SubscribersManager.tsx`): Active / Pending / Unsubscribed tabs + counts,
search, table, delete (`deleteSubscriber` action in `…/subscribers/actions.ts`). Linked from
the `WebsiteWorkspace` header next to "Press coverage".

**Verified E2E** by driving the real confirm/unsubscribe GET handlers:
`pending → confirm (200, active, token cleared, confirmedAt) → reused token (400) →
unsubscribe (200, unsubscribed) → bad token (400)`. Build green, tsc clean. **Not** browser-tested
and **no live email sent** during verification (Jeff runs dev).

---

## Phase 2 — Authoring + Archive (DONE)

Draft newsletters (AI-assisted) and publish a public archive. No sending yet.

**Decision (Jeff):** a **dedicated `Newsletter` model** — chosen over reusing `Generation` — for
its own draft→publish→send lifecycle + send-tracking fields.

- **Data — `Newsletter`** (`engagecampaign` schema): `subject`, `preview?`, `body` (plain text,
  blank-line paragraphs), `model?`, `status` (draft | published), `publishedAt?`, plus P3
  send-tracking `sentAt?` / `recipientCount?`. `@@index([campaignId, status])`. Migration
  `prisma/migrations/add-newsletters.sql` — **APPLIED**.
- **AI drafting** — `src/lib/website/newsletterDraft.ts` (`generateNewsletterDraft(profile,
  instruction, model)`): one structured Claude call (mirrors `generate.ts`), first-person
  candidate voice, tolerant JSON → `{subject, preview, body}`. Returns the draft (never
  persists — the candidate reviews before saving). **Metered against Model Credits** via
  `consumeGeneration` (it's AI writing, like Communications), model-selectable.
- **Actions** `src/app/website/(app)/newsletters/actions.ts`: `createNewsletter` (→ id),
  `updateNewsletter`, `draftNewsletter` (metered AI), `publishNewsletter` (requires subject+body;
  sets `publishedAt`), `unpublishNewsletter`, `deleteNewsletter`. Ownership-checked by campaignId.
- **Manager UI** — `/website/newsletters` (`NewslettersManager.tsx`: list + "New newsletter" +
  active-subscriber count) → `/website/newsletters/[newsletterId]` (`NewsletterEditor.tsx`:
  AI-draft panel with instruction+model, subject/preview/body fields, Save, Save & publish /
  Unpublish, Delete, "View in archive"). Linked from the `WebsiteWorkspace` header ("Newsletters"
  + "Subscribers").
- **Public archive** — `newsletterArchive` **block** (dynamic; lists published issues, "View all"
  link) + `/websites/[campaignId]/newsletter` (list) + `/websites/[campaignId]/newsletter/[id]`
  (detail), both themed via a shared `_render/ArchiveShell.tsx`. `notFound` unless the site is
  published and the issue is `status: published`.
- **Subscribe entry points (two):** (1) the `newsletterSignup` **block** the candidate places on
  any page; (2) an inline subscribe form on **both archive pages** (`_render/ArchiveSubscribe.tsx`,
  reuses `NewsletterSignupForm`) — always present, no setup needed, so a reader of a past issue can
  subscribe on the spot. Both routes hit the same double-opt-in `/api/website/subscribe`.
- **Verified E2E:** live AI draft produced a real 6-paragraph issue in-voice; archive query
  returns published-only (drafts excluded); detail resolves published, blocks drafts. Build green,
  tsc clean. **Not** browser-tested (Jeff runs dev).

---

## Phase 3 — Sending (planned; the hard part)

On publish, email `active` subscribers. This is where the real work/risk lives.

- **✅ Platform sending domain configured (2026-07-30):** `news.engageamplify.com` — party-neutral
  (chosen over `engage.democrat` so it isn't Democrat-branded), DNS on **Cloudflare**, verified in
  Resend. DKIM (`resend._domainkey.news`), SPF + bounce MX (`send.news` → SES us-east-1), and DMARC
  (`_dmarc.news` = `v=DMARC1; p=none; rua=mailto:dmarc@engageamplify.com`) all live; DKIM aligns with
  the From domain. **Fresh domain → warm up gradually; keep `p=none` until aggregate reports confirm
  alignment, then tighten to quarantine → reject.** Bulk sends go from here, **isolated from**
  `mail.engage.democrat` (the warmed transactional/magic-link domain). From = `Campaign Name
  <news@news.engageamplify.com>`, Reply-To = candidate inbox. Resend **Receiving** stays OFF.
- **Launch model = platform domain for all tenants.** Every campaign's newsletter sends from
  `news.engageamplify.com` with the committee name in the display name + reply-to. **Per-campaign
  custom domains** (self-serve "connect your domain" via Resend's Domains API — create domain →
  show DNS → poll verification) become a *later* premium upgrade, not needed to ship.
- **Compliance (CAN-SPAM)** — physical mailing address in every footer (we already collect
  `committeeName`), plus the working one-click unsubscribe (P1 `unsubscribeToken` +
  `/newsletter/unsubscribe` already exist).
- **Deliverability** — verified domain (SPF/DKIM/DMARC); shared-IP reputation across tenants
  (consider dedicated IPs at scale); process **bounces + spam complaints** via Resend webhooks.
- **Build vs. buy** — evaluate Resend **Broadcasts/Audiences** (manages list + unsubscribe +
  bulk send) vs. hand-rolled batched `sendMail`. Lean toward Broadcasts to offload the scary parts.
- **Send tracking** — record `sentAt` / `recipientCount`; guard against double-send.
- **Metering** — likely gate sends per plan (like the other AI features).

---

## Open questions

- ~~Sending domain: does the candidate have one?~~ **Resolved:** platform sends from
  `news.engageamplify.com` for all tenants; per-campaign custom domains are a later premium add-on.
- ~~P2 storage model: reuse `Generation` vs dedicated `Newsletter`?~~ **Resolved:** dedicated
  `Newsletter` model (see Phase 2).
- Whether active subscribers should also mirror into the Contacts CRM.
- Resend plan/volume limits vs. realistic subscriber counts (shared-IP tier) — confirm before
  first real send.
