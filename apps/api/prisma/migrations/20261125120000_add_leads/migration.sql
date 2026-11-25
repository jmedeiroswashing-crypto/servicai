-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "leadSearchesUsedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN "leadSearchesUsedPeriod" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "SavedLead" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "rating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "mapsUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedLead_providerId_idx" ON "SavedLead"("providerId");

-- AddForeignKey
ALTER TABLE "SavedLead" ADD CONSTRAINT "SavedLead_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
