-- Campaign Settings expansion: party endorsements, structured mailing address,
-- and candidate headshot moved from Website → Campaign. Applied via `prisma db
-- execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

-- Fusion party endorsements alongside the primary ballot line.
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "additionalParties" TEXT[] NOT NULL DEFAULT '{}';

-- Structured US postal address (replaces the free-text mailingAddress).
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingStreet" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingStreet2" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingCity" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingState" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingZip" TEXT;

-- Candidate headshot now lives on Campaign (was on Website).
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "headshotData" BYTEA;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "headshotMime" TEXT;

-- One-time copy of any existing website headshot into its campaign (only fills
-- an empty campaign headshot, so re-running is safe).
UPDATE "Campaign" c
SET "headshotData" = w."headshotData", "headshotMime" = w."headshotMime"
FROM "Website" w
WHERE w."campaignId" = c."id"
  AND c."headshotData" IS NULL
  AND w."headshotData" IS NOT NULL;
