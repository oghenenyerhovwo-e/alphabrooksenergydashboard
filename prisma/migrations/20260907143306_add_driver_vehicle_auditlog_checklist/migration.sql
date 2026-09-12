-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "vehicleId" TEXT;

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "type" TEXT,
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

-- CreateTable
CREATE TABLE "TripSafetyChecklist" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "odometerReading" DOUBLE PRECISION NOT NULL,
    "tyresChecked" BOOLEAN NOT NULL DEFAULT false,
    "brakesChecked" BOOLEAN NOT NULL DEFAULT false,
    "lightsChecked" BOOLEAN NOT NULL DEFAULT false,
    "hornChecked" BOOLEAN NOT NULL DEFAULT false,
    "mirrorsChecked" BOOLEAN NOT NULL DEFAULT false,
    "bodyConditionChecked" BOOLEAN NOT NULL DEFAULT false,
    "fireExtinguisherChecked" BOOLEAN NOT NULL DEFAULT false,
    "firstAidKitChecked" BOOLEAN NOT NULL DEFAULT false,
    "emergencyEquipmentChecked" BOOLEAN NOT NULL DEFAULT false,
    "vehicleDocumentsChecked" BOOLEAN NOT NULL DEFAULT false,
    "hasDefect" BOOLEAN NOT NULL DEFAULT false,
    "defectDescription" TEXT,
    "defectPhotoUrl" TEXT,
    "readyToDepart" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripSafetyChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE INDEX "DeliveryAuditLog_deliveryId_idx" ON "DeliveryAuditLog"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSafetyChecklist_deliveryId_key" ON "TripSafetyChecklist"("deliveryId");

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAuditLog" ADD CONSTRAINT "DeliveryAuditLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSafetyChecklist" ADD CONSTRAINT "TripSafetyChecklist_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
