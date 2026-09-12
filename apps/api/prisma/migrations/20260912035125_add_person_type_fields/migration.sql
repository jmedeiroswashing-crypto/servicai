-- CreateEnum
CREATE TYPE "PersonType" AS ENUM ('PF', 'PJ');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressCep" TEXT,
ADD COLUMN     "addressNumber" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "nomeFantasia" TEXT,
ADD COLUMN     "personType" "PersonType",
ADD COLUMN     "razaoSocial" TEXT;
