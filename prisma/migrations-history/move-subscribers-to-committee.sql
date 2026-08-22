-- Stage 2b-1: move NewsletterSubscriber from per-candidate to a committee-wide list.
-- Backfill committeeId from each subscriber's candidate, dedup by (committee,email),
-- then swap the FK/unique/index from campaign(candidate) to committee. Idempotent; dev-only.
SET search_path TO "engagecampaign";

-- 1. Add committeeId + backfill from the candidate's committee (while campaignId still exists).
ALTER TABLE "NewsletterSubscriber" ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='engagecampaign' AND table_name='NewsletterSubscriber' AND column_name='campaignId'
  ) THEN
    UPDATE "NewsletterSubscriber" ns
      SET "committeeId" = cd."committeeId"
      FROM "Candidate" cd
      WHERE cd.id = ns."campaignId" AND ns."committeeId" IS NULL;
  END IF;
END $$;

-- Orphans (candidate gone) can't join a committee — drop them.
DELETE FROM "NewsletterSubscriber" WHERE "committeeId" IS NULL;

-- 2. Dedup: keep the best row per (committeeId, lower(email)) — active > pending > other,
--    then earliest — so the new committee-wide unique won't collide.
DELETE FROM "NewsletterSubscriber" a
USING "NewsletterSubscriber" b
WHERE a."committeeId" = b."committeeId"
  AND lower(a.email) = lower(b.email)
  AND a.id <> b.id
  AND (CASE a.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, a."createdAt", a.id)
    > (CASE b.status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END, b."createdAt", b.id);

-- 3. Drop the old campaign-scoped FK/unique/index + column.
ALTER TABLE "NewsletterSubscriber" DROP CONSTRAINT IF EXISTS "NewsletterSubscriber_campaignId_fkey";
DROP INDEX IF EXISTS "NewsletterSubscriber_campaignId_email_key";
DROP INDEX IF EXISTS "NewsletterSubscriber_campaignId_status_idx";
ALTER TABLE "NewsletterSubscriber" DROP COLUMN IF EXISTS "campaignId";

-- 4. Committee-scoped constraints.
ALTER TABLE "NewsletterSubscriber" ALTER COLUMN "committeeId" SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'NewsletterSubscriber_committeeId_fkey' AND connamespace = 'engagecampaign'::regnamespace
  ) THEN
    ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_committeeId_fkey"
      FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_committeeId_email_key"
  ON "NewsletterSubscriber"("committeeId", "email");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_committeeId_status_idx"
  ON "NewsletterSubscriber"("committeeId", "status");
