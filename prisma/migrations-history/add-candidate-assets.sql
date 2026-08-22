-- Candidate assets: an optional campaign logo (stored in-DB like the headshot) and an
-- ActBlue/donate link. Slogan reuses the existing `tagline` column and the website link
-- reuses the existing `website` column — no new columns needed for those. Additive +
-- idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "logoData" BYTEA;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "logoMime" TEXT;
ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "actblueUrl" TEXT;
