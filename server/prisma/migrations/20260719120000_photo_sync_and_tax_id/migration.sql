-- AlterTable
ALTER TABLE "business_profiles" ADD COLUMN     "taxId" TEXT;

-- CreateTable
CREATE TABLE "photo_sync_photos" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "photoKey" TEXT NOT NULL,
    "imageBytes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_sync_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_sync_photos_sessionId_idx" ON "photo_sync_photos"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "photo_sync_photos_sessionId_photoKey_key" ON "photo_sync_photos"("sessionId", "photoKey");

