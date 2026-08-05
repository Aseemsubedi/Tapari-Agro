-- Squashed baseline matching current prisma/schema.prisma (SCHEMA_REV 33).
-- Fresh deploys: prisma migrate deploy
-- Existing DBs already at this schema: prisma migrate resolve --applied 20260803080000_baseline_current

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT '1 pack',
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "inventoryMode" TEXT NOT NULL DEFAULT 'owned',
    "digitalAvailable" INTEGER NOT NULL DEFAULT 0,
    "sellerVendorId" TEXT,
    "sellerUnitCost" INTEGER NOT NULL DEFAULT 0,
    "essential" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sellOnline" BOOLEAN NOT NULL DEFAULT true,
    "sellOffline" BOOLEAN NOT NULL DEFAULT true,
    "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
    "homeSortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_sellerVendorId_fkey" FOREIGN KEY ("sellerVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomeSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HomeSectionProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "HomeSectionProduct_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "HomeSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "HomeSectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductVendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductVendor_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductVendor_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL DEFAULT '',
    "productId" TEXT NOT NULL,
    "vendorId" TEXT,
    "billNo" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL DEFAULT 0,
    "stockKind" TEXT NOT NULL DEFAULT 'owned',
    "unitCost" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "payMethod" TEXT NOT NULL DEFAULT '',
    "chequeNo" TEXT NOT NULL DEFAULT '',
    "chequeDate" DATETIME,
    "expiresAt" DATETIME,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockPurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockPurchase_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL DEFAULT 'online',
    "checkoutMethod" TEXT NOT NULL DEFAULT 'cash',
    "paymentMethod" TEXT NOT NULL DEFAULT '',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT NOT NULL DEFAULT '',
    "paymentNote" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "supplierStockReceived" BOOLEAN NOT NULL DEFAULT false,
    "inventoryHeld" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL,
    "fulfillMode" TEXT NOT NULL DEFAULT 'owned',
    "ownedQty" INTEGER NOT NULL DEFAULT 0,
    "digitalQty" INTEGER NOT NULL DEFAULT 0,
    "digitalReserved" BOOLEAN NOT NULL DEFAULT false,
    "vendorId" TEXT,
    "sellerUnitCost" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItemDigitalLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "stockPurchaseId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    CONSTRAINT "OrderItemDigitalLot_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemDigitalLot_stockPurchaseId_fkey" FOREIGN KEY ("stockPurchaseId") REFERENCES "StockPurchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SellerSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL,
    "unitCost" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SellerSettlement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SellerSettlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SellerSettlement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "previousPaid" INTEGER NOT NULL DEFAULT 0,
    "balanceAfter" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "chequeNo" TEXT NOT NULL DEFAULT '',
    "chequeDate" DATETIME,
    "partyName" TEXT NOT NULL DEFAULT '',
    "partyPhone" TEXT NOT NULL DEFAULT '',
    "orderId" TEXT NOT NULL DEFAULT '',
    "batchId" TEXT NOT NULL DEFAULT '',
    "refLabel" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "phoneKey" TEXT NOT NULL DEFAULT '',
    "address1" TEXT NOT NULL DEFAULT '',
    "address2" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_name_key" ON "Unit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_sellerVendorId_idx" ON "Product"("sellerVendorId");

-- CreateIndex
CREATE INDEX "Product_inventoryMode_idx" ON "Product"("inventoryMode");

-- CreateIndex
CREATE INDEX "Product_essential_idx" ON "Product"("essential");

-- CreateIndex
CREATE INDEX "HomeSectionProduct_sectionId_idx" ON "HomeSectionProduct"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "HomeSectionProduct_sectionId_productId_key" ON "HomeSectionProduct"("sectionId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_name_key" ON "Vendor"("name");

-- CreateIndex
CREATE INDEX "ProductVendor_productId_idx" ON "ProductVendor"("productId");

-- CreateIndex
CREATE INDEX "ProductVendor_vendorId_idx" ON "ProductVendor"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVendor_productId_vendorId_key" ON "ProductVendor"("productId", "vendorId");

-- CreateIndex
CREATE INDEX "StockPurchase_batchId_idx" ON "StockPurchase"("batchId");

-- CreateIndex
CREATE INDEX "StockPurchase_productId_remainingQty_idx" ON "StockPurchase"("productId", "remainingQty");

-- CreateIndex
CREATE INDEX "StockPurchase_vendorId_idx" ON "StockPurchase"("vendorId");

-- CreateIndex
CREATE INDEX "StockPurchase_stockKind_idx" ON "StockPurchase"("stockKind");

-- CreateIndex
CREATE INDEX "OrderItemDigitalLot_orderItemId_idx" ON "OrderItemDigitalLot"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemDigitalLot_stockPurchaseId_idx" ON "OrderItemDigitalLot"("stockPurchaseId");

-- CreateIndex
CREATE INDEX "OrderItemDigitalLot_vendorId_idx" ON "OrderItemDigitalLot"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSettlement_orderItemId_vendorId_key" ON "SellerSettlement"("orderItemId", "vendorId");

-- CreateIndex
CREATE INDEX "SellerSettlement_vendorId_paid_idx" ON "SellerSettlement"("vendorId", "paid");

-- CreateIndex
CREATE INDEX "SellerSettlement_orderId_idx" ON "SellerSettlement"("orderId");

-- CreateIndex
CREATE INDEX "SellerSettlement_paid_createdAt_idx" ON "SellerSettlement"("paid", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_direction_createdAt_idx" ON "PaymentEvent"("direction", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentEvent_orderId_idx" ON "PaymentEvent"("orderId");

-- CreateIndex
CREATE INDEX "PaymentEvent_batchId_idx" ON "PaymentEvent"("batchId");

-- CreateIndex
CREATE INDEX "PaymentEvent_createdAt_idx" ON "PaymentEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Customer_phoneKey_idx" ON "Customer"("phoneKey");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
