-- CreateTable
CREATE TABLE "WebsiteImage" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mime" TEXT NOT NULL,
    "alt" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteImage_committeeId_idx" ON "WebsiteImage"("committeeId");
