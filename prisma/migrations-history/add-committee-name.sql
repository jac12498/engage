-- Registered campaign committee name on Campaign — powers the legal
-- "Paid for by" disclaimer on the candidate website (and future filings).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema —
-- never `public`, never via `prisma migrate`. Idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "committeeName" TEXT;
