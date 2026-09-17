-- CreateEnum
CREATE TYPE "OutcomeProduct" AS ENUM ('AGO', 'CNG', 'LPG');

-- CreateEnum
CREATE TYPE "OutcomeUnit" AS ENUM ('LITRES', 'SCM', 'KG', 'TONNES', 'UNITS');

-- CreateTable
CREATE TABLE "OutcomeTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" "OutcomeProduct" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetValue" DECIMAL(14,2) NOT NULL,
    "unit" "OutcomeUnit" NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutcomeTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutcomeAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" "OutcomeProduct" NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "achievedValue" DECIMAL(14,2) NOT NULL,
    "unit" "OutcomeUnit" NOT NULL,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutcomeAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutcomeTarget_product_year_month_idx" ON "OutcomeTarget"("product", "year", "month");

-- CreateIndex
CREATE INDEX "OutcomeTarget_userId_idx" ON "OutcomeTarget"("userId");

-- CreateIndex
CREATE INDEX "OutcomeTarget_createdById_idx" ON "OutcomeTarget"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "OutcomeTarget_userId_product_year_month_key" ON "OutcomeTarget"("userId", "product", "year", "month");

-- CreateIndex
CREATE INDEX "OutcomeAchievement_product_year_month_idx" ON "OutcomeAchievement"("product", "year", "month");

-- CreateIndex
CREATE INDEX "OutcomeAchievement_userId_idx" ON "OutcomeAchievement"("userId");

-- CreateIndex
CREATE INDEX "OutcomeAchievement_createdById_idx" ON "OutcomeAchievement"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "OutcomeAchievement_userId_product_year_month_key" ON "OutcomeAchievement"("userId", "product", "year", "month");

-- AddForeignKey
ALTER TABLE "OutcomeTarget" ADD CONSTRAINT "OutcomeTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeTarget" ADD CONSTRAINT "OutcomeTarget_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeTarget" ADD CONSTRAINT "OutcomeTarget_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAchievement" ADD CONSTRAINT "OutcomeAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAchievement" ADD CONSTRAINT "OutcomeAchievement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutcomeAchievement" ADD CONSTRAINT "OutcomeAchievement_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
