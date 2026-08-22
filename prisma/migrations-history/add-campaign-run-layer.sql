-- Stage 2a: introduce the Campaign run-layer under each Candidate.
-- The old Candidate row carried both the person and the run; this splits the run
-- fields + per-race relations (communications, news, newsletter issues) onto a new
-- Campaign (one per candidate to start, cycle 2026). Website + subscribers stay on
-- Candidate for now (moved to Committee in 2b). Idempotent; dev-only.
SET search_path TO "engagecampaign";

-- 0. Stage 1 renamed the Campaign table -> Candidate but left the old constraint/index
--    names ("Campaign_*") on it. Rename them to "Candidate_*" so the new Campaign table
--    can reuse the "Campaign_*" names.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_pkey' AND connamespace = 'engagecampaign'::regnamespace) THEN
    ALTER TABLE "Candidate" RENAME CONSTRAINT "Campaign_pkey" TO "Candidate_pkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_committeeId_fkey' AND connamespace = 'engagecampaign'::regnamespace) THEN
    ALTER TABLE "Candidate" RENAME CONSTRAINT "Campaign_committeeId_fkey" TO "Candidate_committeeId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'engagecampaign' AND indexname = 'Campaign_committeeId_idx') THEN
    ALTER INDEX "engagecampaign"."Campaign_committeeId_idx" RENAME TO "Candidate_committeeId_idx";
  END IF;
END $$;

-- 1. Campaign table.
CREATE TABLE IF NOT EXISTS "Campaign" (
    "id"                  TEXT NOT NULL,
    "candidateId"         TEXT NOT NULL,
    "cycle"               INTEGER NOT NULL,
    "office"              TEXT NOT NULL,
    "party"               TEXT,
    "additionalParties"   TEXT[] NOT NULL DEFAULT '{}',
    "committeeName"       TEXT,
    "filerId"             TEXT,
    "mailingAddress"      TEXT,
    "mailingStreet"       TEXT,
    "mailingStreet2"      TEXT,
    "mailingCity"         TEXT,
    "mailingState"        TEXT,
    "mailingZip"          TEXT,
    "newsletterTemplate"  JSONB,
    "state"               TEXT,
    "district"            TEXT,
    "districtId"          TEXT,
    "districtQueryString" TEXT,
    "districtVoterCount"  INTEGER,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Campaign_candidateId_fkey" FOREIGN KEY ("candidateId")
        REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Campaign_candidateId_idx" ON "Campaign"("candidateId");

-- 2. One Campaign per Candidate (id = 'cmp_'||candidate.id). Only while the run
--    columns still live on Candidate (guards re-runs after step 5).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'engagecampaign' AND table_name = 'Candidate' AND column_name = 'office'
  ) THEN
    INSERT INTO "Campaign" (
      "id","candidateId","cycle","office","party","additionalParties","committeeName","filerId",
      "mailingAddress","mailingStreet","mailingStreet2","mailingCity","mailingState","mailingZip",
      "newsletterTemplate","state","district","districtId","districtQueryString","districtVoterCount","createdAt","updatedAt"
    )
    SELECT 'cmp_'||"id","id",2026,"office","party","additionalParties","committeeName","filerId",
      "mailingAddress","mailingStreet","mailingStreet2","mailingCity","mailingState","mailingZip",
      "newsletterTemplate","state","district","districtId","districtQueryString","districtVoterCount", now(), now()
    FROM "Candidate"
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- 3. Repoint the per-race relations Candidate -> Campaign. Drop FK, prefix ids, re-add
--    FK to Campaign. Guarded so re-runs are no-ops.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['Generation','Topic','ContextItem','NewsClip','Newsletter','NewsletterImage','NewsletterPreset'] LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', t, t||'_campaignId_fkey');
    EXECUTE format('UPDATE %I SET "campaignId" = ''cmp_''||"campaignId" WHERE "campaignId" NOT LIKE ''cmp\_%%'' ESCAPE ''\''', t);
    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE', t, t||'_campaignId_fkey');
  END LOOP;
END $$;

-- 4. Session ids: lastCampaignId held the candidate id (Stage 1); split it.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastCandidateId" TEXT;
UPDATE "User" SET "lastCandidateId" = "lastCampaignId"
  WHERE "lastCandidateId" IS NULL AND "lastCampaignId" IS NOT NULL;
UPDATE "User" SET "lastCampaignId" = 'cmp_'||"lastCampaignId"
  WHERE "lastCampaignId" IS NOT NULL AND "lastCampaignId" NOT LIKE 'cmp\_%' ESCAPE '\';

-- 5. Drop the moved columns from Candidate.
ALTER TABLE "Candidate"
    DROP COLUMN IF EXISTS "office",
    DROP COLUMN IF EXISTS "party",
    DROP COLUMN IF EXISTS "additionalParties",
    DROP COLUMN IF EXISTS "committeeName",
    DROP COLUMN IF EXISTS "filerId",
    DROP COLUMN IF EXISTS "mailingAddress",
    DROP COLUMN IF EXISTS "mailingStreet",
    DROP COLUMN IF EXISTS "mailingStreet2",
    DROP COLUMN IF EXISTS "mailingCity",
    DROP COLUMN IF EXISTS "mailingState",
    DROP COLUMN IF EXISTS "mailingZip",
    DROP COLUMN IF EXISTS "newsletterTemplate",
    DROP COLUMN IF EXISTS "state",
    DROP COLUMN IF EXISTS "district",
    DROP COLUMN IF EXISTS "districtId",
    DROP COLUMN IF EXISTS "districtQueryString",
    DROP COLUMN IF EXISTS "districtVoterCount";
