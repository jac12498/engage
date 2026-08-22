-- Committee restructure — EXPAND + BACKFILL (safe to run against the live site).
--
-- Introduces Committee (account/billing entity) + CommitteeMembership (User↔Committee
-- with role), and re-parents Campaign, Contact, and Tag onto a Committee. Adds all new
-- columns as NULLABLE and backfills them, so already-deployed (old) code keeps working:
-- it simply ignores the new tables/columns. The destructive half (NOT NULL, FKs, and
-- dropping the legacy Campaign.userId / plan / metering columns) lives in the separate
-- `contract-committee-restructure.sql`, which must run ONLY after the new code is live.
--
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema. Idempotent.
SET search_path TO "engagecampaign";

-- ── New tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Committee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "aiModel" TEXT,
    "creditsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "revisionsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "crawlsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "websiteEditsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "newsSearchesThisMonth" INTEGER NOT NULL DEFAULT 0,
    "newsletterEmailsThisMonth" INTEGER NOT NULL DEFAULT 0,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommitteeMembership" (
    "userId" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommitteeMembership_pkey" PRIMARY KEY ("userId", "committeeId"),
    CONSTRAINT "CommitteeMembership_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommitteeMembership_committeeId_fkey" FOREIGN KEY ("committeeId")
        REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CommitteeMembership_committeeId_idx" ON "CommitteeMembership"("committeeId");

-- ── New nullable columns on existing tables ──────────────────────────────────

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
ALTER TABLE "Contact"  ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
ALTER TABLE "Tag"      ADD COLUMN IF NOT EXISTS "committeeId" TEXT;
ALTER TABLE "User"     ADD COLUMN IF NOT EXISTS "lastCommitteeId" TEXT;
ALTER TABLE "User"     ADD COLUMN IF NOT EXISTS "lastCampaignId" TEXT;

-- New-scope indexes (added now; old campaignId indexes dropped in the contract step).
CREATE INDEX IF NOT EXISTS "Campaign_committeeId_idx" ON "Campaign"("committeeId");
CREATE INDEX IF NOT EXISTS "Contact_committeeId_idx" ON "Contact"("committeeId");
CREATE INDEX IF NOT EXISTS "Contact_committeeId_lastName_idx" ON "Contact"("committeeId", "lastName");
CREATE INDEX IF NOT EXISTS "Tag_committeeId_idx" ON "Tag"("committeeId");

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Today every Campaign is 1:1 with a User, so create exactly one Committee per
-- existing Campaign and make that user its owner. Deterministic id ('cmt_' || campaign id)
-- keeps this whole block safely re-runnable.

-- 1) One Committee per existing Campaign (carry over plan + metering; note the
--    legacy credits column is physically named "generationsThisMonth").
INSERT INTO "Committee" (
    "id", "name", "plan", "aiModel",
    "creditsThisMonth", "revisionsThisMonth", "crawlsThisMonth",
    "websiteEditsThisMonth", "newsSearchesThisMonth", "newsletterEmailsThisMonth",
    "billingPeriodStart", "createdAt", "updatedAt"
)
SELECT
    'cmt_' || c."id",
    COALESCE(NULLIF(TRIM(c."committeeName"), ''), c."candidateName" || ' Committee'),
    COALESCE(c."plan", 'starter'),
    c."aiModel",
    COALESCE(c."generationsThisMonth", 0),
    COALESCE(c."revisionsThisMonth", 0),
    COALESCE(c."crawlsThisMonth", 0),
    COALESCE(c."websiteEditsThisMonth", 0),
    COALESCE(c."newsSearchesThisMonth", 0),
    COALESCE(c."newsletterEmailsThisMonth", 0),
    COALESCE(c."billingPeriodStart", CURRENT_TIMESTAMP),
    c."createdAt",
    CURRENT_TIMESTAMP
FROM "Campaign" c
WHERE c."committeeId" IS NULL
ON CONFLICT ("id") DO NOTHING;

-- 2) Owner membership for each campaign's user.
INSERT INTO "CommitteeMembership" ("userId", "committeeId", "role", "createdAt")
SELECT c."userId", 'cmt_' || c."id", 'owner', CURRENT_TIMESTAMP
FROM "Campaign" c
WHERE c."userId" IS NOT NULL
ON CONFLICT ("userId", "committeeId") DO NOTHING;

-- 3) Point each Campaign at its new Committee.
UPDATE "Campaign" c SET "committeeId" = 'cmt_' || c."id" WHERE c."committeeId" IS NULL;

-- 4) Re-parent Contacts and Tags to their campaign's committee.
UPDATE "Contact" ct SET "committeeId" = 'cmt_' || ca."id"
FROM "Campaign" ca WHERE ct."campaignId" = ca."id" AND ct."committeeId" IS NULL;

UPDATE "Tag" t SET "committeeId" = 'cmt_' || ca."id"
FROM "Campaign" ca WHERE t."campaignId" = ca."id" AND t."committeeId" IS NULL;

-- 5) Seed each user's persisted active context.
UPDATE "User" u
SET "lastCommitteeId" = 'cmt_' || c."id", "lastCampaignId" = c."id"
FROM "Campaign" c
WHERE c."userId" = u."id" AND u."lastCommitteeId" IS NULL;
