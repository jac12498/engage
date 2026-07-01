-- Revision history: GenerationVersion + Campaign.revisionsThisMonth.
-- Applied via `prisma db execute` into the isolated `engagecampaign` schema.
SET search_path TO "engagecampaign";

ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "revisionsThisMonth" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "GenerationVersion" (
    "id" TEXT NOT NULL,
    "generationId" TEXT NOT NULL,
    "versionNo" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "revisionNote" TEXT,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GenerationVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GenerationVersion_generationId_fkey" FOREIGN KEY ("generationId")
        REFERENCES "Generation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "GenerationVersion_generationId_idx" ON "GenerationVersion"("generationId");
