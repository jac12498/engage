-- The candidate's own authorized committee filer id (state BOE), captured via the
-- registry search on the Add Candidate form. Scopes a Donor→Contact import to this
-- candidate's committee's donors. Additive + idempotent.
SET search_path TO "engagecampaign";

ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "filerId" TEXT;
