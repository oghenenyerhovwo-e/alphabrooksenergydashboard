import assert from "node:assert/strict";
import type { OutcomeProduct, SaleStatus } from "@/generated/prisma/enums";
import {
  type AchievementAllocationInput,
  type AchievementResult,
  computeAchievement,
} from "@/lib/ledger/achievement";
import { getPaymentPeriod } from "@/lib/ledger/period";
import type { OutcomePeriod } from "@/lib/outcomes/period";

let passed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(
    actual,
    expected,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );

  passed++;
  console.log(`  ok — ${label}`);
}

function allocation(
  userId: string,
  product: OutcomeProduct,
  saleStatus: SaleStatus,
  paymentDate: string,
  quantity: string,
  generatedValue: string
): AchievementAllocationInput {
  const period = getPaymentPeriod(paymentDate);

  return {
    userId,
    product,
    periodYear: period.year,
    periodMonth: period.month,
    saleStatus,
    quantity,
    generatedValue,
  };
}

/** Result as plain strings: quantity 3 dp, value 2 dp, nulls kept. */
function summary(result: AchievementResult) {
  return {
    source: result.source,
    quantity: result.quantity === null ? null : result.quantity.toFixed(3),
    value: result.value === null ? null : result.value.toFixed(2),
    allocationCount: result.allocationCount,
  };
}

const A = allocation("u1", "AGO", "ALLOCATED", "2026-10-31", "3000.000", "240000.00");
const B = allocation("u1", "AGO", "ALLOCATED", "2026-10-01", "1000.500", "80040.00");
const C = allocation("u1", "AGO", "PENDING_ALLOCATION", "2026-10-15", "5000", "400000.00");
const D = allocation("u1", "AGO", "ALLOCATED", "2026-11-01", "700", "56000.00");
const E = allocation("u1", "CNG", "ALLOCATED", "2026-10-10", "900", "72000.00");
const F = allocation("u2", "AGO", "ALLOCATED", "2026-10-10", "800", "64000.00");
const SEPT = allocation("u1", "AGO", "ALLOCATED", "2026-09-20", "100", "8000.00");

const all = [A, B, C, D, E, F];

function achievement(
  period: OutcomePeriod,
  allocations: AchievementAllocationInput[],
  legacy: Parameters<typeof computeAchievement>[0]["legacy"] = null
) {
  return computeAchievement({ userId: "u1", product: "AGO", period, allocations, legacy });
}

console.log("Ledger months");

const october = summary(achievement({ year: 2026, month: 10 }, all));
check(
  "u1 AGO 2026/10 = A + B only (pending, November, CNG and other user excluded)",
  october,
  { source: "LEDGER", quantity: "4000.500", value: "320040.00", allocationCount: 2 }
);

check(
  "u1 AGO 2026/11 = D",
  summary(achievement({ year: 2026, month: 11 }, all)),
  { source: "LEDGER", quantity: "700.000", value: "56000.00", allocationCount: 1 }
);

const december = achievement({ year: 2026, month: 12 }, all);
check("2026/12 (no rows) quantity is 0, not null", december.quantity?.toString(), "0");
check("2026/12 (no rows) value is 0, not null", december.value?.toString(), "0");
check("2026/12 (no rows) count 0, LEDGER", [december.allocationCount, december.source], [0, "LEDGER"]);

check(
  "only pending C supplied -> 0 / 0",
  summary(achievement({ year: 2026, month: 10 }, [C])),
  { source: "LEDGER", quantity: "0.000", value: "0.00", allocationCount: 0 }
);

console.log("Legacy months");

check(
  "2026/9 uses legacy row, ignores the September allocation",
  summary(
    achievement({ year: 2026, month: 9 }, [SEPT], {
      achievedQuantity: "50000",
      achievedGeneratedValue: "4000000.00",
    })
  ),
  { source: "LEGACY", quantity: "50000.000", value: "4000000.00", allocationCount: 0 }
);

check(
  "2026/9 with no legacy row -> null / null",
  summary(achievement({ year: 2026, month: 9 }, [SEPT], null)),
  { source: "LEGACY", quantity: null, value: null, allocationCount: 0 }
);

check(
  "2026/9 legacy value null stays null",
  summary(
    achievement({ year: 2026, month: 9 }, [], {
      achievedQuantity: "50000",
      achievedGeneratedValue: null,
    })
  ),
  { source: "LEGACY", quantity: "50000.000", value: null, allocationCount: 0 }
);

console.log("Ledger month ignores legacy");

check(
  "2026/10 with a legacy row supplied = same as without",
  summary(
    achievement({ year: 2026, month: 10 }, all, {
      achievedQuantity: "50000",
      achievedGeneratedValue: "4000000.00",
    })
  ),
  october
);

console.log(`\n${passed} ledger-achievement checks passed.`);
