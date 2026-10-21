-- AlterTable
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ProviderProfile_city_idx" ON "ProviderProfile"("city");

-- CreateIndex
CREATE INDEX "Service_providerId_idx" ON "Service"("providerId");

-- CreateIndex
CREATE INDEX "Review_providerId_idx" ON "Review"("providerId");

-- CreateIndex
CREATE INDEX "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX "Booking_providerId_status_idx" ON "Booking"("providerId", "status");

-- CreateIndex
CREATE INDEX "Conversation_providerId_idx" ON "Conversation"("providerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Favorite_providerId_idx" ON "Favorite"("providerId");

-- CreateIndex
CREATE INDEX "ServiceRequest_clientId_idx" ON "ServiceRequest"("clientId");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_category_idx" ON "ServiceRequest"("status", "category");

-- CreateIndex
CREATE INDEX "Proposal_providerId_idx" ON "Proposal"("providerId");

-- Os três índices abaixo (ProductFavorite, MarketplaceConversation,
-- MarketplaceMessage) foram removidos desta migration: essas tabelas não
-- existem mais — a migration 20261014222146_remove_marketplace já tinha
-- apagado o Marketplace de produtos do banco antes desta rodar.
