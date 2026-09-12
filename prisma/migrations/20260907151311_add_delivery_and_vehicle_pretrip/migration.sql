/*
  Warnings:

  - You are about to drop the column `driverId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `vehicleId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the `DeliveryAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Driver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripSafetyChecklist` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "VehicleInspectionStatus" AS ENUM ('READY_TO_DEPART', 'NOT_READY_TO_DEPART');

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "DeliveryAuditLog" DROP CONSTRAINT "DeliveryAuditLog_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "TripSafetyChecklist" DROP CONSTRAINT "TripSafetyChecklist_deliveryId_fkey";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "driverId",
DROP COLUMN "vehicleId";

-- DropTable
DROP TABLE "DeliveryAuditLog";

-- DropTable
DROP TABLE "Driver";

-- DropTable
DROP TABLE "TripSafetyChecklist";

-- DropTable
DROP TABLE "Vehicle";

-- CreateTable
CREATE TABLE "VehiclePreTripInspection" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "odometerReading" DOUBLE PRECISION NOT NULL,
    "tyresSatisfactory" BOOLEAN NOT NULL,
    "brakesSatisfactory" BOOLEAN NOT NULL,
    "lightsSatisfactory" BOOLEAN NOT NULL,
    "hornSatisfactory" BOOLEAN NOT NULL,
    "mirrorsSatisfactory" BOOLEAN NOT NULL,
    "vehicleBodySatisfactory" BOOLEAN NOT NULL,
    "fireExtinguisherSatisfactory" BOOLEAN NOT NULL,
    "firstAidKitSatisfactory" BOOLEAN NOT NULL,
    "emergencyEquipmentSatisfactory" BOOLEAN NOT NULL,
    "vehicleDocumentsSatisfactory" BOOLEAN NOT NULL,
    "hasDefect" BOOLEAN NOT NULL,
    "defectDescription" TEXT,
    "defectPhotoUrl" TEXT,
    "inspectionStatus" "VehicleInspectionStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehiclePreTripInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VehiclePreTripInspection_deliveryId_key" ON "VehiclePreTripInspection"("deliveryId");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_vehicleNumber_idx" ON "VehiclePreTripInspection"("vehicleNumber");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_driverName_idx" ON "VehiclePreTripInspection"("driverName");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_inspectionDate_idx" ON "VehiclePreTripInspection"("inspectionDate");

-- CreateIndex
CREATE INDEX "VehiclePreTripInspection_inspectionStatus_idx" ON "VehiclePreTripInspection"("inspectionStatus");

-- CreateIndex
CREATE INDEX "Delivery_vehicle_idx" ON "Delivery"("vehicle");

-- AddForeignKey
ALTER TABLE "VehiclePreTripInspection" ADD CONSTRAINT "VehiclePreTripInspection_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
