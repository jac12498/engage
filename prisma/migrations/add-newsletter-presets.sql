-- Saved newsletter presets (branding + layout) + per-issue branding override.
-- Applied via `prisma db execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

ALTER TABLE "Newsletter" ADD COLUMN IF NOT EXISTS "template" JSONB;

CREATE TABLE IF NOT EXISTS "NewsletterPreset" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "template" JSONB NOT NULL,
  "blocks" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterPreset_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'NewsletterPreset_campaignId_fkey'
  ) THEN
    ALTER TABLE "NewsletterPreset"
      ADD CONSTRAINT "NewsletterPreset_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "NewsletterPreset_campaignId_idx" ON "NewsletterPreset"("campaignId");
