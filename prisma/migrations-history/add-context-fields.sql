-- Two-tier context: campaign-wide (Campaign.generalContext, always injected) and
-- topic-specific (Topic.context, injected only when that topic is used).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "generalContext" TEXT;
ALTER TABLE "Topic" ADD COLUMN IF NOT EXISTS "context" TEXT;
