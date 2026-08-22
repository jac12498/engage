-- Stage 2b-2: move Website from per-Candidate to per-Committee (1:1). Backfill
-- committeeId from the site's candidate; if a committee somehow has >1 site keep the
-- most-recently-updated; default siteTitle/paidForBy to the committee name; swap the
-- FK/unique from candidate → committee. Idempotent; dev-only.
SET search_path TO "engagecampaign";

-- 1. New committee-level columns.
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "siteTitle" TEXT;
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "paidForBy" TEXT;

-- 2. Backfill committeeId from the site's candidate (while campaignId still exists).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='engagecampaign' AND table_name='Website' AND column_name='campaignId'
  ) THEN
    UPDATE "Website" w SET "committeeId" = cd."committeeId"
      FROM "Candidate" cd WHERE cd.id = w."campaignId" AND w."committeeId" IS NULL;
  END IF;
END $$;

-- Orphans (candidate gone) can't attach to a committee — drop.
DELETE FROM "Website" WHERE "committeeId" IS NULL;

-- 3. Collision: at most one site per committee — keep the most-recently-updated.
DELETE FROM "Website" a
USING "Website" b
WHERE a."committeeId" = b."committeeId" AND a.id <> b.id
  AND (a."updatedAt", a.id) < (b."updatedAt", b.id);

-- 4. Default identity from the committee name.
UPDATE "Website" w SET "siteTitle" = cm.name FROM "Committee" cm WHERE cm.id = w."committeeId" AND w."siteTitle" IS NULL;
UPDATE "Website" w SET "paidForBy" = cm.name FROM "Committee" cm WHERE cm.id = w."committeeId" AND w."paidForBy" IS NULL;

-- 5. Swap the FK/unique from candidate → committee.
ALTER TABLE "Website" DROP CONSTRAINT IF EXISTS "Website_campaignId_fkey";
DROP INDEX IF EXISTS "Website_campaignId_key";
ALTER TABLE "Website" DROP COLUMN IF EXISTS "campaignId";
ALTER TABLE "Website" ALTER COLUMN "committeeId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Website_committeeId_key" ON "Website"("committeeId");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='Website_committeeId_fkey' AND connamespace='engagecampaign'::regnamespace
  ) THEN
    ALTER TABLE "Website" ADD CONSTRAINT "Website_committeeId_fkey"
      FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
