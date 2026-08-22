-- Phase 2: per-message metering for the conversational website builder.
-- Adds a monthly counter alongside the existing usage counters on Campaign.
-- Idempotent. Applied via:
--   npx prisma db execute --file prisma/migrations/add-website-edits-counter.sql
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign"
    ADD COLUMN IF NOT EXISTS "websiteEditsThisMonth" INTEGER NOT NULL DEFAULT 0;
