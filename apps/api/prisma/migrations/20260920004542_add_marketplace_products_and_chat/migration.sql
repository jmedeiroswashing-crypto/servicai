-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NOVO', 'USADO');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "condition" "ProductCondition" NOT NULL DEFAULT 'USADO',
    "city" TEXT NOT NULL,
    "state" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "photoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceConversation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_status_category_idx" ON "Product"("status", "category");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFavorite_userId_productId_key" ON "ProductFavorite"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConversation_productId_buyerId_key" ON "MarketplaceConversation"("productId", "buyerId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFavorite" ADD CONSTRAINT "ProductFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFavorite" ADD CONSTRAINT "ProductFavorite_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
