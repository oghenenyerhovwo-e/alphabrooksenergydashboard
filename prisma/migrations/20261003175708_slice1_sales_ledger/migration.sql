-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('MANUAL', 'ZOHO');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING_ALLOCATION', 'ALLOCATED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('OUTCOME_TARGET', 'OUTCOME_ACHIEVEMENT', 'SALE_RECORD', 'SALE_ALLOCATION');

-- AlterEnum (hand-edited: rename in place so existing ADMIN rows become IT;
-- the new values must not be used elsewhere in this migration)
ALTER TYPE "UserRole" RENAME VALUE 'ADMIN' TO 'IT';
ALTER TYPE "UserRole" ADD VALUE 'MANAGEMENT';
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "OutcomeTarget" ADD COLUMN     "instructionDate" DATE,
ADD COLUMN     "setByInstructionOf" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "username" TEXT,
ALTER COLUMN "entraId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SaleRecord" (
    "id" TEXT NOT NULL,
    "product" "OutcomeProduct" NOT NULL,
    "source" "SaleSource" NOT NULL DEFAULT 'MANUAL',
    "zohoPaymentId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "zohoCustomerId" TEXT,
    "paymentDate" DATE NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "totalQuantity" DECIMAL(20,3) NOT NULL,
    "unit" "OutcomeUnit" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING_ALLOCATION',
    "reversesSaleId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleAllocation" (
    "id" TEXT NOT NULL,
    "saleRecordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharePercent" DECIMAL(5,2) NOT NULL,
    "quantity" DECIMAL(20,3) NOT NULL,
    "marginPerUnit" DECIMAL(18,4) NOT NULL,
    "generatedValue" DECIMAL(30,2) NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" TEXT NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "parentEntityId" TEXT,
    "action" "AuditAction" NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleRecord_zohoPaymentId_key" ON "SaleRecord"("zohoPaymentId");

-- CreateIndex
CREATE INDEX "SaleRecord_product_periodYear_periodMonth_status_idx" ON "SaleRecord"("product", "periodYear", "periodMonth", "status");

-- CreateIndex
CREATE INDEX "SaleRecord_status_idx" ON "SaleRecord"("status");

-- CreateIndex
CREATE INDEX "SaleRecord_invoiceNumber_idx" ON "SaleRecord"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SaleRecord_createdById_idx" ON "SaleRecord"("createdById");

-- CreateIndex
CREATE INDEX "SaleAllocation_userId_idx" ON "SaleAllocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleAllocation_saleRecordId_userId_key" ON "SaleAllocation"("saleRecordId", "userId");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_createdAt_idx" ON "AuditEntry"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEntry_parentEntityId_idx" ON "AuditEntry"("parentEntityId");

-- CreateIndex
CREATE INDEX "AuditEntry_actorUserId_idx" ON "AuditEntry"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEntry_createdAt_idx" ON "AuditEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_reversesSaleId_fkey" FOREIGN KEY ("reversesSaleId") REFERENCES "SaleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAllocation" ADD CONSTRAINT "SaleAllocation_saleRecordId_fkey" FOREIGN KEY ("saleRecordId") REFERENCES "SaleRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAllocation" ADD CONSTRAINT "SaleAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAllocation" ADD CONSTRAINT "SaleAllocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleAllocation" ADD CONSTRAINT "SaleAllocation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Allocation safeguards
ALTER TABLE "SaleAllocation"
  ADD CONSTRAINT "SaleAllocation_sharePercent_range" CHECK ("sharePercent" > 0 AND "sharePercent" <= 100),
  ADD CONSTRAINT "SaleAllocation_marginPerUnit_nonnegative" CHECK ("marginPerUnit" >= 0);

-- AuditEntry is append-only
CREATE FUNCTION "audit_entry_append_only"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditEntry is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "AuditEntry_no_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditEntry"
  FOR EACH ROW EXECUTE FUNCTION "audit_entry_append_only"();

CREATE TRIGGER "AuditEntry_no_truncate"
  BEFORE TRUNCATE ON "AuditEntry"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_entry_append_only"();
