-- Confirmed contribution matches on a Contact (state NY disclosures + federal FEC),
-- added via the "Find donations" review flow. Snapshot rows (source parquets have no
-- stable NY row id). Idempotent; applied via `prisma db execute --file`.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "ContactDonation" (
    "id"           TEXT NOT NULL,
    "contactId"    TEXT NOT NULL,
    "committeeId"  TEXT NOT NULL,
    "source"       TEXT NOT NULL,
    "refKey"       TEXT NOT NULL,
    "donorName"    TEXT,
    "recipient"    TEXT,
    "amount"       DOUBLE PRECISION,
    "donationDate" TEXT,
    "cycle"        INTEGER,
    "city"         TEXT,
    "state"        TEXT,
    "employer"     TEXT,
    "occupation"   TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ContactDonation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContactDonation_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ContactDonation_contactId_source_refKey_key"
    ON "ContactDonation"("contactId", "source", "refKey");
CREATE INDEX IF NOT EXISTS "ContactDonation_contactId_idx" ON "ContactDonation"("contactId");
