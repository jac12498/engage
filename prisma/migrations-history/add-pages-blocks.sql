-- Phase 1 (Step 1A): Page/Block content model for the candidate website.
-- Additive — the legacy Website copy columns + WebsiteIssue are left in place and
-- dropped later in Step 1E. Applied via `prisma db execute`. Idempotent.
--   npx prisma db execute --file prisma/migrations/add-pages-blocks.sql
SET search_path TO "engagecampaign";

CREATE TABLE IF NOT EXISTS "Page" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "navOrder" INTEGER NOT NULL DEFAULT 0,
    "showInNav" BOOLEAN NOT NULL DEFAULT true,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Page_websiteId_fkey" FOREIGN KEY ("websiteId")
        REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Page_websiteId_slug_key" ON "Page"("websiteId", "slug");
CREATE INDEX IF NOT EXISTS "Page_websiteId_idx" ON "Page"("websiteId");

CREATE TABLE IF NOT EXISTS "Block" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "props" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Block_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Block_pageId_fkey" FOREIGN KEY ("pageId")
        REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Block_pageId_idx" ON "Block"("pageId");
