-- AlterTable
ALTER TABLE "User" ADD COLUMN "identityAutoDecision" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "identityAutoReason" TEXT;
