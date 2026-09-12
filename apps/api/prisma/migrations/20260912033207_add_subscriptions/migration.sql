-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('GRATIS', 'PRO', 'BUSINESS', 'PREMIUM');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ATIVA', 'CANCELADA', 'INADIMPLENTE');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "planPriority" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'GRATIS',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ATIVA',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "aiUsageCount" INTEGER NOT NULL DEFAULT 0,
    "aiUsagePeriod" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_providerId_key" ON "Subscription"("providerId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
