import type { OutcomeProduct, SaleStatus } from "@/generated/prisma/enums";
import {
  type DecimalInput,
  type OutcomeDecimal,
  toOutcomeDecimal,
} from "@/lib/outcomes/decimal";
import type { OutcomePeriod } from "@/lib/outcomes/period";
import { isLedgerMonth } from "@/lib/ledger/period";

export interface AchievementAllocationInput {
  userId: string;
  product: OutcomeProduct;
  periodYear: number;
  periodMonth: number;
  saleStatus: SaleStatus;
  quantity: DecimalInput;        // stored SaleAllocation.quantity
  generatedValue: DecimalInput;  // stored SaleAllocation.generatedValue
}

export interface LegacyAchievementInput {
  achievedQuantity: DecimalInput;
  achievedGeneratedValue: DecimalInput | null;
}

export interface AchievementResult {
  source: "LEDGER" | "LEGACY";
  quantity: OutcomeDecimal | null;
  value: OutcomeDecimal | null;
  allocationCount: number;
}

/**
 * One person's achievement for one product and month.
 *
 * - Ledger month: sum of the stored quantity and generatedValue of that
 *   person's allocations on ALLOCATED sales in the month. `legacy` is
 *   ignored. No matching rows gives 0, not null.
 * - Legacy month: `allocations` are ignored; the legacy
 *   OutcomeAchievement row is returned as is (null when there is none).
 *
 * Values are summed as stored, never recomputed from quantity × margin,
 * so the month total always equals the visible rows.
 */
export function computeAchievement(input: {
  userId: string;
  product: OutcomeProduct;
  period: OutcomePeriod;
  allocations: AchievementAllocationInput[];
  legacy: LegacyAchievementInput | null;
}): AchievementResult {
  const { userId, product, period, allocations, legacy } = input;

  if (!isLedgerMonth(period)) {
    return {
      source: "LEGACY",
      quantity: legacy ? toOutcomeDecimal(legacy.achievedQuantity) : null,
      value:
        legacy && legacy.achievedGeneratedValue !== null
          ? toOutcomeDecimal(legacy.achievedGeneratedValue)
          : null,
      allocationCount: 0,
    };
  }

  const matching = allocations.filter(
    (allocation) =>
      allocation.userId === userId &&
      allocation.product === product &&
      allocation.periodYear === period.year &&
      allocation.periodMonth === period.month &&
      allocation.saleStatus === "ALLOCATED"
  );

  let quantity = toOutcomeDecimal(0);
  let value = toOutcomeDecimal(0);
  for (const allocation of matching) {
    quantity = quantity.add(toOutcomeDecimal(allocation.quantity));
    value = value.add(toOutcomeDecimal(allocation.generatedValue));
  }

  return {
    source: "LEDGER",
    quantity,
    value,
    allocationCount: matching.length,
  };
}
