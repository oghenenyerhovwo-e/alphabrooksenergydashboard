/*
  Warnings:

  - You are about to drop the column `driverName` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `driverPhone` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `vehicle` on the `Delivery` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Delivery_driverName_idx";

-- DropIndex
DROP INDEX "Delivery_vehicle_idx";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "driverName",
DROP COLUMN "driverPhone",
DROP COLUMN "vehicle",
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- AlterTable
ALTER TABLE "VehiclePreTripInspection" ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAuditLog" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Driver_name_idx" ON "Driver"("name");

-- CreateIndex
CREATE INDEX "Driver_active_idx" ON "Driver"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_plateNumber_idx" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "Vehicle_active_idx" ON "Vehicle"("active");

-- CreateIndex
CREATE INDEX "DeliveryAuditLog_deliveryId_idx" ON "DeliveryAuditLog"("deliveryId");

-- CreateIndex
CREATE INDEX "DeliveryAuditLog_createdAt_idx" ON "DeliveryAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Delivery_driverId_idx" ON "Delivery"("driverId");

-- CreateIndex
CREATE INDEX "Delivery_vehicleId_idx" ON "Delivery"("vehicleId");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_driverId_idx" ON "VehiclePreTripInspection"("driverId");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_vehicleId_idx" ON "VehiclePreTripInspection"("vehicleId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAuditLog" ADD CONSTRAINT "DeliveryAuditLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePreTripInspection" ADD CONSTRAINT "VehiclePreTripInspection_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePreTripInspection" ADD CONSTRAINT "VehiclePreTripInspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
