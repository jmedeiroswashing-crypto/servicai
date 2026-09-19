-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEMBRETE_MANUTENCAO';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "category" TEXT;
