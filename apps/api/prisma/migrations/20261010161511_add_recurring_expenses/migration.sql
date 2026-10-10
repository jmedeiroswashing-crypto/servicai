-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recurringParentId" TEXT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
