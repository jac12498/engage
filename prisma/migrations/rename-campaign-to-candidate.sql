-- Three-tier model, Stage 1: the old "Campaign" row is really the Candidate (the
-- person). Rename the table Campaign -> Candidate. FK columns stay "campaignId"
-- (Stage 2 re-parents them). Postgres auto-updates dependent FK references; the
-- constraint/index names keep their "Campaign_" prefixes (cosmetic). Idempotent.
SET search_path TO "engagecampaign";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'engagecampaign' AND table_name = 'Campaign'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'engagecampaign' AND table_name = 'Candidate'
  ) THEN
    ALTER TABLE "engagecampaign"."Campaign" RENAME TO "Candidate";
  END IF;
END $$;
