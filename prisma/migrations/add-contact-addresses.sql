-- Contacts: multiple labeled addresses (Home/Mailing/Business…), replacing the
-- single address/city/state/zip columns on Contact. Migrates the existing single
-- address into a "Home" row, then drops the old columns. Applied via
-- `prisma db execute`. Backfill is guarded so the file is safe to re-run.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "ContactAddress" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "placeId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ContactAddress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ContactAddress_contactId_fkey" FOREIGN KEY ("contactId")
        REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ContactAddress_contactId_idx" ON "ContactAddress"("contactId");

-- Backfill the old single address into a "Home" row (only when some part is set).
-- line1 is NOT NULL, so fall back to city/state/zip when the street line is empty.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='engagecampaign' AND table_name='Contact' AND column_name='address') THEN
    INSERT INTO "ContactAddress" ("id", "contactId", "label", "line1", "city", "state", "zip", "order")
    SELECT gen_random_uuid()::text, c."id", 'Home',
           COALESCE(NULLIF(c."address", ''), NULLIF(c."city", ''), NULLIF(c."state", ''), c."zip", ''),
           c."city", c."state", c."zip", 0
      FROM "Contact" c
     WHERE COALESCE(c."address", c."city", c."state", c."zip") IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "ContactAddress" a WHERE a."contactId" = c."id");
  END IF;
END $$;

-- Drop the retired single-address columns.
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "address";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "city";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "state";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "zip";
