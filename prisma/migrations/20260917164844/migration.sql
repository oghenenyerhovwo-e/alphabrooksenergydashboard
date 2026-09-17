-- AlterTable
ALTER TABLE "OutcomeAchievement" ADD COLUMN     "achievedGeneratedValue" DECIMAL(30,2),
ADD COLUMN     "achievedMarginPerUnit" DECIMAL(18,4),
ALTER COLUMN "achievedValue" SET DATA TYPE DECIMAL(20,3);

-- AlterTable
ALTER TABLE "OutcomeTarget" ADD COLUMN     "targetGeneratedValue" DECIMAL(30,2),
ADD COLUMN     "targetMarginPerUnit" DECIMAL(18,4),
ALTER COLUMN "targetValue" SET DATA TYPE DECIMAL(20,3);
