-- Track the latest release-notes version a user has viewed (drives the sidebar
-- "What's new" unseen-dot). Idempotent.
ALTER TABLE engagecampaign."User"
  ADD COLUMN IF NOT EXISTS "lastSeenReleaseVersion" TEXT;
