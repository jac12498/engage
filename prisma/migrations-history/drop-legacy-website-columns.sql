-- Phase 1 (Step 1E): drop the legacy Website copy columns + the WebsiteIssue table.
-- All website content now lives in Page/Block (Steps 1A–1D); nothing reads or writes
-- these anymore. Idempotent. Applied via:
--   npx prisma db execute --file prisma/migrations/drop-legacy-website-columns.sql
SET search_path TO "engagecampaign";

ALTER TABLE "Website"
    DROP COLUMN IF EXISTS "heroHeadline",
    DROP COLUMN IF EXISTS "heroSubhead",
    DROP COLUMN IF EXISTS "aboutHeading",
    DROP COLUMN IF EXISTS "aboutBody",
    DROP COLUMN IF EXISTS "issuesIntro",
    DROP COLUMN IF EXISTS "volunteerIntro";

DROP TABLE IF EXISTS "WebsiteIssue";
