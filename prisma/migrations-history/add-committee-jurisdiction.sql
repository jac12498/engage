-- Committee jurisdiction: "state" (state BOE filer id) vs "federal" (FEC committee id).
-- `filerId` is the recipient id in that jurisdiction. Existing rows are state committees.
-- Additive + idempotent; applied via `prisma db execute --file`.
SET search_path TO "engagecampaign";

ALTER TABLE "Committee"
    ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT NOT NULL DEFAULT 'state';
