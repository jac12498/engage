-- Monthly website-crawl usage counter.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "crawlsThisMonth" INTEGER NOT NULL DEFAULT 0;
