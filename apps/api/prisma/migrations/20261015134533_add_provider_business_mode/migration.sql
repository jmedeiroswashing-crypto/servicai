-- CreateEnum
CREATE TYPE "BusinessMode" AS ENUM ('GESTAO', 'COMPLETO');

-- AlterTable
-- null = prestador ainda não escolheu (conta antiga ou cadastro direto pela
-- API) — nesse caso é perguntado uma vez no primeiro acesso ao painel.
ALTER TABLE "ProviderProfile" ADD COLUMN "businessMode" "BusinessMode";
