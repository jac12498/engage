-- AI Communications: Generation + NewsItem tables and Campaign usage fields.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema —
-- never `public`, never via `prisma migrate`. Idempotent (IF NOT EXISTS).
SET search_path TO "engagecampaign";

-- Campaign usage / model-preference fields
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "aiModel" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "generationsThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "billingPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Generation
CREATE TABLE IF NOT EXISTS "Generation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "issueId" TEXT,
    "newsItemId" TEXT,
    "newsHook" TEXT,
    "model" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Generation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Generation_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Generation_campaignId_idx" ON "Generation"("campaignId");

-- NewsItem
CREATE TABLE IF NOT EXISTS "NewsItem" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "summary" TEXT,
    "content" TEXT,
    "publishedAt" TIMESTAMP(3),
    "relevant" BOOLEAN NOT NULL DEFAULT true,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NewsItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NewsItem_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "NewsItem_campaignId_idx" ON "NewsItem"("campaignId");
