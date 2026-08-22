-- Committee registration profile — state, committee type, and (optional) state
-- Filer ID. Powers the committee-first onboarding flow. Purely additive + nullable,
-- so it's safe on the live site before the new code deploys.
--
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema. Idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "committeeType" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "filerId" TEXT;
