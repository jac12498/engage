# Engage Campaign

The non-partisan campaign platform — a unified shell over a shared core, with five
modular pillars gated by plan:

1. **AI Communications**
2. **Candidate Websites**
3. **Voter Outreach**
4. **Fundraising**
5. **Field Tools**

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

Next 16 · React 19 · TypeScript · Tailwind 4 · shadcn-style UI. Postgres/Prisma is
added during the engine-port step.

## Develop

```bash
npm install
npm run dev
```
