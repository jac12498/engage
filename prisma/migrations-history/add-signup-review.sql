-- Volunteer-signup moderation queue: status + review metadata + link to the
-- Contact created on accept. Applied via `prisma db execute`. Idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "VolunteerSignup" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "VolunteerSignup" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "VolunteerSignup" ADD COLUMN IF NOT EXISTS "contactId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'engagecampaign'
      AND constraint_name = 'VolunteerSignup_contactId_fkey'
  ) THEN
    ALTER TABLE "VolunteerSignup"
      ADD CONSTRAINT "VolunteerSignup_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "VolunteerSignup_websiteId_status_idx" ON "VolunteerSignup"("websiteId", "status");
CREATE INDEX IF NOT EXISTS "VolunteerSignup_contactId_idx" ON "VolunteerSignup"("contactId");
