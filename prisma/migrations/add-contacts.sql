-- Contacts / CRM: the unified contact list for a campaign.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "type" TEXT NOT NULL DEFAULT 'supporter',
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Contact_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Contact_campaignId_idx" ON "Contact"("campaignId");
CREATE INDEX IF NOT EXISTS "Contact_campaignId_lastName_idx" ON "Contact"("campaignId", "lastName");
