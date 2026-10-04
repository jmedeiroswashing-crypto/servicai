-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'RESERVA';

-- AlterEnum
ALTER TYPE "ReportReason" ADD VALUE 'SERVICO_NAO_CONFORME';

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('NAO_ENVIADO', 'PENDENTE', 'APROVADO', 'REJEITADO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "identityStatus" "IdentityStatus" NOT NULL DEFAULT 'NAO_ENVIADO',
ADD COLUMN     "identityDocumentUrl" TEXT,
ADD COLUMN     "identityRejectionReason" TEXT,
ADD COLUMN     "identitySubmittedAt" TIMESTAMP(3),
ADD COLUMN     "identityReviewedAt" TIMESTAMP(3),
ADD COLUMN     "identityReviewedById" TEXT;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "respondentId" TEXT,
ADD COLUMN     "respondentStatement" TEXT,
ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_identityReviewedById_fkey" FOREIGN KEY ("identityReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
