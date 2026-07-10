-- Candidate Website headshot: store the uploaded photo in-DB instead of a URL.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "headshotData" BYTEA;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "headshotMime" TEXT;
ALTER TABLE "Website" DROP COLUMN IF EXISTS "headshotUrl";
