-- Reference sub-type on ContextItem: "webpage" | "document" (PDF).
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

ALTER TABLE "ContextItem" ADD COLUMN IF NOT EXISTS "refType" TEXT;

-- Existing references were URL-based webpages.
UPDATE "ContextItem" SET "refType" = 'webpage' WHERE "type" = 'reference' AND "refType" IS NULL;
