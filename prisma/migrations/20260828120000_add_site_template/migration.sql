-- CreateTable
CREATE TABLE "SiteTemplate" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "appliesTo" TEXT NOT NULL DEFAULT 'any',
    "source" TEXT,
    "prototype" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteTemplate_committeeId_idx" ON "SiteTemplate"("committeeId");
