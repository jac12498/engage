-- CreateTable
CREATE TABLE "ContactMergeDismissal" (
    "committeeId" TEXT NOT NULL,
    "aId" TEXT NOT NULL,
    "bId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMergeDismissal_pkey" PRIMARY KEY ("aId","bId")
);

-- CreateIndex
CREATE INDEX "ContactMergeDismissal_committeeId_idx" ON "ContactMergeDismissal"("committeeId");
