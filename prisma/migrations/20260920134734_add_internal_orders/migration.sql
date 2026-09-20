-- CreateTable
CREATE TABLE "InternalOrderReferenceCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InternalOrderReferenceCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "InternalOrder" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "zohoCustomerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "product" "DeliveryProduct" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "deliveryLocation" TEXT NOT NULL,
    "customerReference" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InternalOrder_referenceNumber_key" ON "InternalOrder"("referenceNumber");

-- CreateIndex
CREATE INDEX "InternalOrder_zohoCustomerId_idx" ON "InternalOrder"("zohoCustomerId");

-- CreateIndex
CREATE INDEX "InternalOrder_createdAt_idx" ON "InternalOrder"("createdAt");

-- CreateIndex
CREATE INDEX "InternalOrder_createdById_idx" ON "InternalOrder"("createdById");

-- AddForeignKey
ALTER TABLE "InternalOrder" ADD CONSTRAINT "InternalOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
