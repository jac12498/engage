-- Phase 3 newsletter sending: CAN-SPAM postal address + per-month send meter.
-- Applied via `prisma db execute`. Idempotent / re-runnable.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "mailingAddress" TEXT;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "newsletterEmailsThisMonth" INTEGER NOT NULL DEFAULT 0;
