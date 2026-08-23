-- CreateTable
CREATE TABLE "ContactSavedSearch" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactSavedSearch_committeeId_idx" ON "ContactSavedSearch"("committeeId");
