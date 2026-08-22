-- Unify Issue + NewsItem into ContextItem (typed: note | position | reference).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

-- New columns on ContextItem (existing rows default to type 'note').
ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'note';
ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "keyPoints" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Migrate positions (Issue → type 'position').
INSERT INTO "ContextItem" ("id", "campaignId", "type", "title", "body", "keyPoints", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "campaignId", 'position', "title", "position", "keyPoints", "order", "createdAt", "updatedAt"
FROM "Issue";

-- Migrate references (NewsItem → type 'reference').
INSERT INTO "ContextItem" ("id", "campaignId", "type", "title", "body", "url", "source", "keyPoints", "order", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "campaignId", 'reference', "title", COALESCE("summary", "content", "title"), "url", "source", '{}', 0, "createdAt", "createdAt"
FROM "NewsItem";

-- Retire the old tables.
DROP TABLE IF EXISTS "Issue";
DROP TABLE IF EXISTS "NewsItem";
