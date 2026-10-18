-- Remove Marketplace de produtos por completo (zero adoção orgânica real
-- confirmada antes desta migration: 0 produtos, 0 conversas, 0 denúncias de
-- produto vindos de contas reais).

-- DropTable (ordem respeita as foreign keys: filhos antes dos pais)
DROP TABLE IF EXISTS "MarketplaceMessage";
DROP TABLE IF EXISTS "MarketplaceConversation";
DROP TABLE IF EXISTS "ProductFavorite";
DROP TABLE IF EXISTS "Product";

-- DropEnum (só eram usados pelo Product)
DROP TYPE IF EXISTS "ProductStatus";
DROP TYPE IF EXISTS "ProductCondition";

-- Remove o valor PRODUTO do enum ReportTargetType. Confirmado antes desta
-- migration: nenhum registro de Report usa esse valor hoje, então a
-- recriação do tipo é segura.
ALTER TYPE "ReportTargetType" RENAME TO "ReportTargetType_old";
CREATE TYPE "ReportTargetType" AS ENUM ('USUARIO', 'AVALIACAO', 'SERVICO', 'RESERVA');
ALTER TABLE "Report" ALTER COLUMN "targetType" TYPE "ReportTargetType" USING ("targetType"::text::"ReportTargetType");
DROP TYPE "ReportTargetType_old";
