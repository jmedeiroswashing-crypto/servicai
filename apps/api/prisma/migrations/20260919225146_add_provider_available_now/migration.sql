-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "availableNow" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "availableUntil" TIMESTAMP(3);
