-- Candidate knowledge fields (guided interview) on Campaign.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema —
-- never `public`, never via `prisma migrate`. Idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "education" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "experience" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "whyRunning" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "coreValues" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "politicalLean" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "voiceTone" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "interview" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "interviewUpdatedAt" TIMESTAMP(3);
