/*
  Warnings:

  - The values [ACTIVE,CLOSED] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `qualificationReason` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `qualificationState` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `qualifiedAt` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `qualifiedById` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('NEW', 'FOLLOW_UP', 'PROSPECT', 'LOST', 'UNQUALIFIED', 'NOT_INTERESTED');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_qualifiedById_fkey";

-- DropIndex
DROP INDEX "Lead_qualificationState_idx";

-- DropIndex
DROP INDEX "Lead_qualifiedById_idx";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "qualificationReason",
DROP COLUMN "qualificationState",
DROP COLUMN "qualifiedAt",
DROP COLUMN "qualifiedById",
ADD COLUMN     "outcomeAt" TIMESTAMP(3),
ADD COLUMN     "outcomeById" TEXT,
ADD COLUMN     "outcomeReason" TEXT,
ALTER COLUMN "status" SET DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "Lead_outcomeById_idx" ON "Lead"("outcomeById");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_outcomeById_fkey" FOREIGN KEY ("outcomeById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
