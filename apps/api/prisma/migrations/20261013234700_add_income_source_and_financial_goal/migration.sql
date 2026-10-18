-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('MANUAL', 'RESERVA');

-- AlterTable
ALTER TABLE "Income" ADD COLUMN "source" "IncomeSource" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Income" ADD COLUMN "bookingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Income_bookingId_key" ON "Income"("bookingId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "reachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialGoal_providerId_month_key" ON "FinancialGoal"("providerId", "month");

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
