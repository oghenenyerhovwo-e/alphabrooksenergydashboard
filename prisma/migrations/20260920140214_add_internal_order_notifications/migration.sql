-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "internalOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_internalOrderId_fkey" FOREIGN KEY ("internalOrderId") REFERENCES "InternalOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
