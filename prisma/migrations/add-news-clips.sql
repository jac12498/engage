-- "In the News" press-coverage clips + monthly web-search discovery counter.
-- Applied via `prisma db execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "newsSearchesThisMonth" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "NewsClip" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "headline" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "outlet" TEXT,
  "summary" TEXT,
  "publishedAt" TIMESTAMP(3),
  "source" TEXT NOT NULL DEFAULT 'web_search',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsClip_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'NewsClip_campaignId_fkey'
  ) THEN
    ALTER TABLE "NewsClip"
      ADD CONSTRAINT "NewsClip_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "NewsClip_campaignId_url_key" ON "NewsClip"("campaignId", "url");
CREATE INDEX IF NOT EXISTS "NewsClip_campaignId_status_idx" ON "NewsClip"("campaignId", "status");
