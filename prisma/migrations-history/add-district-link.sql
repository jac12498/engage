-- Add district-link snapshot columns to Campaign (the bridge to voter records).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema —
-- never `public`, and never via `prisma migrate` (no _prisma_migrations row in
-- version10.3's shared bookkeeping).
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "districtId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "districtQueryString" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "districtVoterCount" INTEGER;
