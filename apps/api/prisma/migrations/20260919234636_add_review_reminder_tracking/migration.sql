-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'LEMBRETE_AVALIACAO';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "reviewReminderSentAt" TIMESTAMP(3);
