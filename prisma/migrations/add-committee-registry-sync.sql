-- Registry sync snapshot on Committee - set by the admin Data Import reconciliation
-- so we can flag in-use committees (those with a filerId) that became TERMINATED or
-- whose registry details changed. Purely additive + nullable; informational only.
--
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema. Idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "registryStatus"   TEXT;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "registrySnapshot" JSONB;
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "registrySyncedAt" TIMESTAMP(3);
ALTER TABLE "Committee" ADD COLUMN IF NOT EXISTS "registryAlert"    TEXT;
