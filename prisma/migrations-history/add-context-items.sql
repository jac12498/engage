-- Context as a list: ContextItem (topicId null = general, set = topic-scoped).
-- Replaces the single-field Campaign.generalContext + Topic.context.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "ContextItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "topicId" TEXT,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContextItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContextItem_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContextItem_topicId_fkey" FOREIGN KEY ("topicId")
        REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContextItem_campaignId_idx" ON "ContextItem"("campaignId");
CREATE INDEX IF NOT EXISTS "ContextItem_topicId_idx" ON "ContextItem"("topicId");

-- Retire the single-field context columns added earlier.
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "generalContext";
ALTER TABLE "Topic" DROP COLUMN IF EXISTS "context";
