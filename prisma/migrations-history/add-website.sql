-- Candidate Website: Website + WebsiteIssue + VolunteerSignup.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "Website" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "primaryColor" TEXT NOT NULL DEFAULT '#1b3a6b',
    "accentColor" TEXT NOT NULL DEFAULT '#c4910a',
    "fontTheme" TEXT NOT NULL DEFAULT 'classic',
    "headshotUrl" TEXT,
    "heroHeadline" TEXT,
    "heroSubhead" TEXT,
    "aboutHeading" TEXT,
    "aboutBody" TEXT,
    "issuesIntro" TEXT,
    "volunteerIntro" TEXT,
    "donateUrl" TEXT,
    "contactEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Website_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Website_campaignId_fkey" FOREIGN KEY ("campaignId")
        REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Website_campaignId_key" ON "Website"("campaignId");
CREATE UNIQUE INDEX IF NOT EXISTS "Website_slug_key" ON "Website"("slug");

CREATE TABLE IF NOT EXISTS "WebsiteIssue" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "WebsiteIssue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WebsiteIssue_websiteId_fkey" FOREIGN KEY ("websiteId")
        REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WebsiteIssue_websiteId_idx" ON "WebsiteIssue"("websiteId");

CREATE TABLE IF NOT EXISTS "VolunteerSignup" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VolunteerSignup_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VolunteerSignup_websiteId_fkey" FOREIGN KEY ("websiteId")
        REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "VolunteerSignup_websiteId_idx" ON "VolunteerSignup"("websiteId");
