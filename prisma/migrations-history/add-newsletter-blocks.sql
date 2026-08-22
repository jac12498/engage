-- Block-based newsletters: per-issue content blocks + campaign-level template.
-- Applied via `prisma db execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

ALTER TABLE "Newsletter" ADD COLUMN IF NOT EXISTS "blocks" JSONB;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "newsletterTemplate" JSONB;
