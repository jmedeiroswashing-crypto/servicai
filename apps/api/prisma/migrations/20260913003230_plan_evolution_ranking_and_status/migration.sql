-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionStatus" ADD VALUE 'TESTE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAGAMENTO_PENDENTE';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'CANCELAMENTO_SOLICITADO';
ALTER TYPE "SubscriptionStatus" ADD VALUE 'EXPIRADA';

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "profileViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "searchAppearances" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "proposalsUsedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proposalsUsedPeriod" TEXT NOT NULL DEFAULT '';
