import assert from "node:assert/strict";
import {
  getLagosPeriod,
  getPaymentPeriod,
  isLedgerMonth,
} from "@/lib/ledger/period";

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

function checkThrows(label: string, fn: () => unknown) {
  assert.throws(fn, TypeError, `${label}: expected a TypeError`);

  passed++;
  console.log(`  ok — ${label}`);
}

console.log("getPaymentPeriod — month boundaries");

check("2026-10-31 -> 2026/10", getPaymentPeriod("2026-10-31"), { year: 2026, month: 10 });
check("2026-11-01 -> 2026/11", getPaymentPeriod("2026-11-01"), { year: 2026, month: 11 });

console.log("getPaymentPeriod — year boundary");

check("2026-12-31 -> 2026/12", getPaymentPeriod("2026-12-31"), { year: 2026, month: 12 });
check("2027-01-01 -> 2027/1", getPaymentPeriod("2027-01-01"), { year: 2027, month: 1 });

console.log("getLagosPeriod — Lagos is UTC+1");

check(
  "2026-10-31T23:30:00Z is 1 November in Lagos -> 2026/11",
  getLagosPeriod(new Date("2026-10-31T23:30:00Z")),
  { year: 2026, month: 11 }
);
check(
  "2026-10-31T22:59:59Z is still 31 October in Lagos -> 2026/10",
  getLagosPeriod(new Date("2026-10-31T22:59:59Z")),
  { year: 2026, month: 10 }
);

console.log("getPaymentPeriod — invalid dates throw");

checkThrows("2026-02-30 throws", () => getPaymentPeriod("2026-02-30"));
checkThrows("2026-13-01 throws", () => getPaymentPeriod("2026-13-01"));
checkThrows("2026/10/01 throws", () => getPaymentPeriod("2026/10/01"));
checkThrows("empty string throws", () => getPaymentPeriod(""));

console.log("isLedgerMonth");

check("2026/9 is not a ledger month", isLedgerMonth({ year: 2026, month: 9 }), false);
check("2026/10 is a ledger month", isLedgerMonth({ year: 2026, month: 10 }), true);
check("2027/1 is a ledger month", isLedgerMonth({ year: 2027, month: 1 }), true);
check("2025/12 is not a ledger month", isLedgerMonth({ year: 2025, month: 12 }), false);

console.log(`\n${passed} ledger-period checks passed.`);
