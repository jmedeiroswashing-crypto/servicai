-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('EM_ANALISE', 'AGUARDANDO_APROVACAO', 'AGUARDANDO_PECA', 'PRONTO', 'ENTREGUE');

-- CreateTable
CREATE TABLE "RepairShop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairShop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairDevice" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "deviceModel" TEXT NOT NULL,
    "imei" TEXT,
    "defect" TEXT NOT NULL,
    "photos" TEXT[],
    "budgetValue" DOUBLE PRECISION,
    "status" "RepairStatus" NOT NULL DEFAULT 'EM_ANALISE',
    "trackingToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairShop_email_key" ON "RepairShop"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RepairDevice_trackingToken_key" ON "RepairDevice"("trackingToken");

-- CreateIndex
CREATE INDEX "RepairDevice_shopId_status_idx" ON "RepairDevice"("shopId", "status");

-- AddForeignKey
ALTER TABLE "RepairDevice" ADD CONSTRAINT "RepairDevice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "RepairShop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
