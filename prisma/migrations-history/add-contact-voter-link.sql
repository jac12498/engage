-- Link a Contact to a voter record (the "Find voter record" flow). The voter data
-- itself lives in the voter parquets; we only persist the chosen id + its state.
-- Purely additive + nullable. Idempotent; applied via `prisma db execute --file`.
SET search_path TO "engagecampaign";

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "stateVoterId" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "voterState"   TEXT;
