-- Newsletter subscribers (double opt-in mailing list). Applied via `prisma db
-- execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "NewsletterSubscriber" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "source" TEXT NOT NULL DEFAULT 'website',
  "confirmToken" TEXT,
  "unsubscribeToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'NewsletterSubscriber_campaignId_fkey'
  ) THEN
    ALTER TABLE "NewsletterSubscriber"
      ADD CONSTRAINT "NewsletterSubscriber_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSubscriber_campaignId_email_key" ON "NewsletterSubscriber"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "NewsletterSubscriber_campaignId_status_idx" ON "NewsletterSubscriber"("campaignId", "status");
