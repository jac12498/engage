-- Topics (hot topics) + Generation.topicId/medium.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "keyMessage" TEXT,
    "targetAudience" TEXT,
    "occasion" TEXT,
    "talkingPoints" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Topic_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Topic_campaignId_idx" ON "Topic"("campaignId");

ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "topicId" TEXT;
ALTER TABLE "Generation" ADD COLUMN IF NOT EXISTS "medium" TEXT;

DO $$ BEGIN
    ALTER TABLE "Generation" ADD CONSTRAINT "Generation_topicId_fkey"
        FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "Generation_topicId_idx" ON "Generation"("topicId");
