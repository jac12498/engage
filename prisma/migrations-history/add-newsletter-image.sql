-- Newsletter image uploads (in-DB, served at /api/newsletter/image/[id]).
-- Applied via `prisma db execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "NewsletterImage" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "mime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterImage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'NewsletterImage_campaignId_fkey'
  ) THEN
    ALTER TABLE "NewsletterImage"
      ADD CONSTRAINT "NewsletterImage_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "NewsletterImage_campaignId_idx" ON "NewsletterImage"("campaignId");
