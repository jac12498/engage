-- Move AI Communications grounding from the Candidate/Campaign up to the Committee
-- (Phase 1, committee-first): interview + voice knowledge onto Committee, and
-- Topic + ContextItem re-keyed from Campaign to Committee. Data-preserving.

-- ── Committee: add grounding columns ────────────────────────────────────────
ALTER TABLE "Committee"
  ADD COLUMN "whyRunning"         TEXT,
  ADD COLUMN "experience"         TEXT,
  ADD COLUMN "education"          TEXT,
  ADD COLUMN "coreValues"         TEXT,
  ADD COLUMN "politicalLean"      TEXT,
  ADD COLUMN "voiceTone"          TEXT,
  ADD COLUMN "interview"          JSONB,
  ADD COLUMN "interviewUpdatedAt" TIMESTAMP(3);

-- Backfill each committee's grounding from its primary (oldest) candidate.
UPDATE "Committee" c SET
  "whyRunning"         = cd."whyRunning",
  "experience"         = cd."experience",
  "education"          = cd."education",
  "coreValues"         = cd."coreValues",
  "politicalLean"      = cd."politicalLean",
  "voiceTone"          = cd."voiceTone",
  "interview"          = cd."interview",
  "interviewUpdatedAt" = cd."interviewUpdatedAt"
FROM (
  SELECT DISTINCT ON ("committeeId")
    "committeeId", "whyRunning", "experience", "education", "coreValues",
    "politicalLean", "voiceTone", "interview", "interviewUpdatedAt"
  FROM "Candidate"
  ORDER BY "committeeId", "createdAt" ASC
) cd
WHERE cd."committeeId" = c."id";

-- ── Topic: re-key campaignId -> committeeId ─────────────────────────────────
ALTER TABLE "Topic" ADD COLUMN "committeeId" TEXT;
UPDATE "Topic" t SET "committeeId" = ca."committeeId"
  FROM "Campaign" cp
  JOIN "Candidate" ca ON ca."id" = cp."candidateId"
  WHERE cp."id" = t."campaignId";
-- Any topic that couldn't resolve a committee (orphaned) is unusable now — drop it.
DELETE FROM "Topic" WHERE "committeeId" IS NULL;

ALTER TABLE "Topic" DROP CONSTRAINT "Topic_campaignId_fkey";
DROP INDEX IF EXISTS "Topic_campaignId_idx";
ALTER TABLE "Topic" DROP COLUMN "campaignId";
ALTER TABLE "Topic" ALTER COLUMN "committeeId" SET NOT NULL;
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_committeeId_fkey"
  FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Topic_committeeId_idx" ON "Topic"("committeeId");

-- ── ContextItem: re-key campaignId -> committeeId (topicId link unchanged) ───
ALTER TABLE "ContextItem" ADD COLUMN "committeeId" TEXT;
UPDATE "ContextItem" ci SET "committeeId" = ca."committeeId"
  FROM "Campaign" cp
  JOIN "Candidate" ca ON ca."id" = cp."candidateId"
  WHERE cp."id" = ci."campaignId";
DELETE FROM "ContextItem" WHERE "committeeId" IS NULL;

ALTER TABLE "ContextItem" DROP CONSTRAINT "ContextItem_campaignId_fkey";
DROP INDEX IF EXISTS "ContextItem_campaignId_idx";
ALTER TABLE "ContextItem" DROP COLUMN "campaignId";
ALTER TABLE "ContextItem" ALTER COLUMN "committeeId" SET NOT NULL;
ALTER TABLE "ContextItem" ADD CONSTRAINT "ContextItem_committeeId_fkey"
  FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ContextItem_committeeId_idx" ON "ContextItem"("committeeId");

-- ── Candidate: drop the moved grounding columns ─────────────────────────────
ALTER TABLE "Candidate"
  DROP COLUMN "whyRunning",
  DROP COLUMN "experience",
  DROP COLUMN "education",
  DROP COLUMN "coreValues",
  DROP COLUMN "politicalLean",
  DROP COLUMN "voiceTone",
  DROP COLUMN "interview",
  DROP COLUMN "interviewUpdatedAt";
