/*
  Warnings:

  - A unique constraint covering the columns `[zohoCustomerId]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "zohoCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Lead_zohoCustomerId_key" ON "Lead"("zohoCustomerId");
