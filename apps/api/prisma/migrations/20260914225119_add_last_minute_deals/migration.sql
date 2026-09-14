-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('ATIVA', 'RESERVADA', 'CANCELADA');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'VAGA_RESERVADA';

-- CreateTable
CREATE TABLE "LastMinuteDeal" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "dealPrice" DOUBLE PRECISION NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'ATIVA',
    "claimedById" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LastMinuteDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LastMinuteDeal_status_scheduledAt_idx" ON "LastMinuteDeal"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "LastMinuteDeal" ADD CONSTRAINT "LastMinuteDeal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LastMinuteDeal" ADD CONSTRAINT "LastMinuteDeal_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
