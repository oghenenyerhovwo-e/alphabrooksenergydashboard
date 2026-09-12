-- AlterTable: add columns as nullable first, so the existing row isn't broken
ALTER TABLE "Delivery" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "driverSignatureUrl" TEXT;
ALTER TABLE "Delivery" ADD COLUMN "receiverSignatureUrl" TEXT;

-- Backfill the existing row(s) with a placeholder so the NOT NULL
-- constraint below can be applied. Update this manually afterwards
-- with the real contact email for that delivery.
UPDATE "Delivery" SET "contactEmail" = 'unknown@alphabrooks.local' WHERE "contactEmail" IS NULL;

-- Now enforce NOT NULL on contactEmail, matching schema.prisma
ALTER TABLE "Delivery" ALTER COLUMN "contactEmail" SET NOT NULL;