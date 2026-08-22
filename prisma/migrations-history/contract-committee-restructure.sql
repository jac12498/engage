-- Committee restructure — CONTRACT (DESTRUCTIVE). Run ONLY after the new,
-- committee-aware application code is deployed and verified. This drops the
-- legacy Campaign.userId / plan / metering columns and the old campaign-scoped
-- Contact/Tag columns — old code that still reads them would break.
--
-- Preconditions (verify first — see the SELECTs at the bottom of add-committees work):
--   • No NULL "committeeId" remains in Campaign, Contact, or Tag.
--   • Every legacy user has an 'owner' CommitteeMembership.
--
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema. Idempotent.
SET search_path TO "engagecampaign";

-- ── Enforce the new relationships (NOT NULL + FKs) ───────────────────────────

ALTER TABLE "Campaign" ALTER COLUMN "committeeId" SET NOT NULL;
ALTER TABLE "Contact"  ALTER COLUMN "committeeId" SET NOT NULL;
ALTER TABLE "Tag"      ALTER COLUMN "committeeId" SET NOT NULL;

DO $$ BEGIN
    ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_committeeId_fkey"
        FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Contact" ADD CONSTRAINT "Contact_committeeId_fkey"
        FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Tag" ADD CONSTRAINT "Tag_committeeId_fkey"
        FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New Tag uniqueness (committee-scoped) replaces the old campaign-scoped one.
DROP INDEX IF EXISTS "Tag_campaignId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_committeeId_name_key" ON "Tag"("committeeId", "name");

-- ── Drop legacy campaign-scoped Contact/Tag columns + indexes ────────────────

DROP INDEX IF EXISTS "Contact_campaignId_idx";
DROP INDEX IF EXISTS "Contact_campaignId_lastName_idx";
DROP INDEX IF EXISTS "Tag_campaignId_idx";

ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_campaignId_fkey";
ALTER TABLE "Tag"     DROP CONSTRAINT IF EXISTS "Tag_campaignId_fkey";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "campaignId";
ALTER TABLE "Tag"     DROP COLUMN IF EXISTS "campaignId";

-- ── Drop legacy billing/ownership columns from Campaign ──────────────────────

ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_userId_fkey";
DROP INDEX IF EXISTS "Campaign_userId_key";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "plan";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "aiModel";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "generationsThisMonth"; -- legacy name for creditsThisMonth
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "revisionsThisMonth";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "crawlsThisMonth";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "websiteEditsThisMonth";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "newsSearchesThisMonth";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "newsletterEmailsThisMonth";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "billingPeriodStart";
