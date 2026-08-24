-- CreateTable
CREATE TABLE "CommitteeTag" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitteeTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommitteeTag_committeeId_idx" ON "CommitteeTag"("committeeId");

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeTag_committeeId_slug_key" ON "CommitteeTag"("committeeId", "slug");
