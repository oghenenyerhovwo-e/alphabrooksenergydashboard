-- CreateTable
CREATE TABLE "OperationsDailyReport" (
    "id" TEXT NOT NULL,
    "reportDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectionStatus" TEXT NOT NULL,
    "totalUniqueTasks" INTEGER NOT NULL,
    "completedUniqueTasks" INTEGER NOT NULL,
    "completionPercentage" INTEGER,
    "completedCount" INTEGER NOT NULL,
    "inProgressCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "overdueCount" INTEGER NOT NULL,
    "blockerCount" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "OperationsDailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OperationsDailyReport_reportDate_key" ON "OperationsDailyReport"("reportDate");

-- CreateIndex
CREATE INDEX "OperationsDailyReport_capturedAt_idx" ON "OperationsDailyReport"("capturedAt");
