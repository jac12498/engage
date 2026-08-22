-- Newsletter issues (draft → publish → send lifecycle). Applied via `prisma db
-- execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "Newsletter" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "subject" TEXT NOT NULL DEFAULT '',
  "preview" TEXT,
  "body" TEXT NOT NULL DEFAULT '',
  "model" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "publishedAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "recipientCount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'Newsletter_campaignId_fkey'
  ) THEN
    ALTER TABLE "Newsletter"
      ADD CONSTRAINT "Newsletter_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Newsletter_campaignId_status_idx" ON "Newsletter"("campaignId", "status");
