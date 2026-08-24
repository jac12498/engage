-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "customFields" JSONB;

-- CreateTable
CREATE TABLE "ContactField" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactField_committeeId_idx" ON "ContactField"("committeeId");
