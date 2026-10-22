# Engage Campaign

The non-partisan campaign platform — a unified shell over a shared core, with five
modular pillars gated by plan:

1. **AI Communications**
2. **Candidate Websites**
3. **Voter Outreach**
4. **Fundraising**
5. **Field Tools**

## Who it's for

Candidates, campaign managers, and committees — especially small, local, and
down-ballot campaigns that can't afford a full staff or a stack of separate tools. The
goal is one place to manage supporters, communicate with them, and publish a campaign
website, with AI to speed up the writing. The product is non-partisan.

## Architecture

- **Platform core** (always on): account/committee, **Contacts (CRM)**, and the
  **voter file & search**. The shared data substrate every pillar reads and writes.
- **Modules**: the five pillars, unlocked by plan via the entitlements model in
  `src/lib/entitlements.ts` (currently a stub; later backed by the account's plan in
  the database and enforced server-side).

This is a fresh, modern build. The existing `app.engage.democrat` app stays live and
untouched for the Democratic market; the data engine (voter files, campaign-finance
data, pipelines, domain logic) will be **ported** into this app — not rebuilt.

## Stack

Next 16 (App Router) · React 19 · TypeScript · Tailwind 4 · shadcn-style UI ·
Postgres (Supabase) via Prisma 7 · Auth.js (NextAuth v5) magic-link sign-in · Resend
(email + newsletters) · Anthropic Claude (AI drafting) · DuckDB over Parquet
(campaign-finance and voter data). Targets deployment on Railway.

## Develop

Requires Node 20+ and a Postgres database (a free Supabase project works).

```bash
cp .env.example .env     # then fill in your own values (never commit .env)
npm install              # also runs `prisma generate`
npx prisma migrate deploy
npm run dev              # http://localhost:3000
```

All keys in `.env.example` are placeholders. Large datasets (voter file, full
campaign-finance parquets) are not in the repo; see
[docs/STORAGE_SETUP.md](docs/STORAGE_SETUP.md). The small NY committee registry
(public-record data from the NY State Board of Elections) is included. The sample
content in `src/app/ai/models/samples.ts` is fictional.

```bash
npm run build && npm start
```

## Roadmap

- [x] Contacts / CRM — import, search, duplicate merge, tags, donations
- [x] AI Communications and newsletters
- [x] Basic Website Builder implementation — page/block editor, per-section AI,
  scaffold-or-scratch site creation, page manager, templates, and website import
  (manually walked through 2026-10-22)
- [ ] **Visual website builder** — improve the builder from a page/block list into a more
  visual, WYSIWYG-style editor (live preview, click-to-edit on the page, drag-and-drop
  layout, visual theming). Not aiming to re-implement Squarespace or Wix — just a much
  more visual editing experience than blocks alone.
- [ ] Voter Outreach pillar
- [ ] Fundraising pillar
- [ ] Field Tools pillar
- [ ] **Campaign print & merch ordering** — let users design and order campaign signs
  (yard signs, placards), palm cards, flyers, and swag (shirts, hats, buttons, stickers,
  car magnets) without leaving Engage. Orders would be paid in-app (Stripe) and submitted
  to print vendors by API (shipping directly to the customer). Vendors are still being
  evaluated (candidates: SinaLite for signs and printed materials; Printful for
  stickers, magnets, buttons, and apparel); details will be refined once vendors are chosen.
- [ ] Plan-based entitlements backed by the database (currently a stub in
  `src/lib/entitlements.ts`)
- [ ] First production deploy — see [docs/DEPLOY_CHECKLIST.md](docs/DEPLOY_CHECKLIST.md)
- [ ] Automated tests

## Documentation

- [Contacts / CRM](docs/contacts-crm.md) — contact list, detail page, tags/notes,
  address autocomplete, and the volunteer-signup moderation queue.

## License

[MIT](./LICENSE) © Jeff Collins
