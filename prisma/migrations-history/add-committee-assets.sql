-- Committee assets (logo, ActBlue/donate link, website link) + a committee mailing
-- address — the committee-level parallel to candidate assets. Logo stored in-DB like
-- the candidate/website logo. Additive + idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "logoData" BYTEA;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "logoMime" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "actblueUrl" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "mailingStreet" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "mailingStreet2" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "mailingCity" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "mailingState" TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "mailingZip" TEXT;
