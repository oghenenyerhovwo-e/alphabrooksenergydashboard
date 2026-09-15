-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'REFERRAL', 'SALES', 'BUSINESS_DEVELOPMENT', 'PHONE', 'EMAIL', 'WHATSAPP', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "QualificationState" AS ENUM ('PENDING', 'QUALIFIED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "LeadReferenceCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LeadReferenceCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "location" TEXT,
    "source" "LeadSource" NOT NULL,
    "productInterest" "DeliveryProduct",
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'ACTIVE',
    "qualificationState" "QualificationState" NOT NULL DEFAULT 'PENDING',
    "qualificationReason" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "qualifiedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "requestedProduct" "DeliveryProduct" NOT NULL,
    "requestedQuantity" DOUBLE PRECISION,
    "unit" "DeliveryUnit",
    "deliveryLocation" TEXT,
    "requestedDeliveryDate" TIMESTAMP(3),
    "description" TEXT,
    "notes" TEXT,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'OPEN',
    "qualificationState" "QualificationState" NOT NULL DEFAULT 'PENDING',
    "qualificationReason" TEXT,
    "qualifiedAt" TIMESTAMP(3),
    "qualifiedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAuditLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "quoteRequestId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequestReferenceCounter" (
    "year" INTEGER NOT NULL,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteRequestReferenceCounter_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_referenceNumber_key" ON "Lead"("referenceNumber");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_qualificationState_idx" ON "Lead"("qualificationState");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_referenceNumber_key" ON "QuoteRequest"("referenceNumber");

-- CreateIndex
CREATE INDEX "QuoteRequest_leadId_idx" ON "QuoteRequest"("leadId");

-- CreateIndex
CREATE INDEX "QuoteRequest_status_idx" ON "QuoteRequest"("status");

-- CreateIndex
CREATE INDEX "QuoteRequest_qualificationState_idx" ON "QuoteRequest"("qualificationState");

-- CreateIndex
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");

-- CreateIndex
CREATE INDEX "CommercialAuditLog_leadId_idx" ON "CommercialAuditLog"("leadId");

-- CreateIndex
CREATE INDEX "CommercialAuditLog_quoteRequestId_idx" ON "CommercialAuditLog"("quoteRequestId");

-- CreateIndex
CREATE INDEX "CommercialAuditLog_createdAt_idx" ON "CommercialAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAuditLog" ADD CONSTRAINT "CommercialAuditLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialAuditLog" ADD CONSTRAINT "CommercialAuditLog_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
