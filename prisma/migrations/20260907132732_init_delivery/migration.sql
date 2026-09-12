-- CreateEnum
CREATE TYPE "DeliveryProduct" AS ENUM ('CNG', 'AGO', 'PMS', 'LPG_BULK', 'LPG_CYLINDERS', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryUnit" AS ENUM ('SCM', 'KG', 'MT', 'LITRES', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DRAFT', 'ASSIGNED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'PARTIALLY_DELIVERED', 'REJECTED', 'FAILED', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DeliveryNoteCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DeliveryNoteCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "deliveryNoteNumber" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "customerLocation" TEXT,
    "deliveryAddress" TEXT NOT NULL,
    "product" "DeliveryProduct" NOT NULL,
    "unit" "DeliveryUnit" NOT NULL,
    "quantityLoaded" DOUBLE PRECISION,
    "quantityDelivered" DOUBLE PRECISION,
    "quantityReturned" DOUBLE PRECISION,
    "loadingPoint" TEXT,
    "deliveryPoint" TEXT,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehicle" TEXT,
    "trailerNumber" TEXT,
    "odometerBefore" DOUBLE PRECISION,
    "odometerAfter" DOUBLE PRECISION,
    "departureLocation" TEXT,
    "destination" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3),
    "arrivalAt" TIMESTAMP(3),
    "routeTaken" TEXT,
    "distanceTravelled" DOUBLE PRECISION,
    "routeDeviation" BOOLEAN NOT NULL DEFAULT false,
    "routeDeviationNote" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DRAFT',
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "deliveryRemarks" TEXT,
    "hasIssue" BOOLEAN NOT NULL DEFAULT false,
    "issueType" TEXT,
    "issueDescription" TEXT,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_deliveryNoteNumber_key" ON "Delivery"("deliveryNoteNumber");

-- CreateIndex
CREATE INDEX "Delivery_status_idx" ON "Delivery"("status");

-- CreateIndex
CREATE INDEX "Delivery_driverName_idx" ON "Delivery"("driverName");

-- CreateIndex
CREATE INDEX "Delivery_createdAt_idx" ON "Delivery"("createdAt");
