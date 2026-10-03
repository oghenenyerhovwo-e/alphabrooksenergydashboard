import assert from "node:assert/strict";
import {
  type AllocationShareInput,
  computeAllocationValue,
  splitAllocation,
} from "@/lib/ledger/allocation";
import { computeTargetGeneratedValue } from "@/lib/ledger/targets";
import { toOutcomeDecimal } from "@/lib/outcomes/decimal";

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

/** Split, then check per-user quantities (3 dp) and Σ quantities eq total. */
function checkSplit(
  label: string,
  total: string,
  shares: AllocationShareInput[],
  expected: Array<[string, string]>
) {
  const rows = splitAllocation(total, shares);

  check(
    `${label}: quantities`,
    rows.map((row) => [row.userId, row.quantity.toFixed(3)]),
    expected
  );

  const sum = rows.reduce((acc, row) => acc.add(row.quantity), toOutcomeDecimal(0));
  check(`${label}: Σ quantities eq total`, sum.eq(total), true);
}

const thirds: AllocationShareInput[] = [
  { userId: "u1", sharePercent: "33.33" },
  { userId: "u2", sharePercent: "33.33" },
  { userId: "u3", sharePercent: "33.34" },
];

console.log("computeTargetGeneratedValue");

check(
  "80,000 × 80 = 6,400,000.00",
  computeTargetGeneratedValue("80000", "80").toFixed(2),
  "6400000.00"
);
check(
  "12,345.678 × 80.75 = 996,913.50 (from 996,913.4985)",
  computeTargetGeneratedValue("12345.678", "80.75").toFixed(2),
  "996913.50"
);

console.log("computeAllocationValue — half-up to 2 dp");

check("1.000 × 0.0050 = 0.01", computeAllocationValue("1.000", "0.0050").toFixed(2), "0.01");
check("1.000 × 0.0049 = 0.00", computeAllocationValue("1.000", "0.0049").toFixed(2), "0.00");
check(
  "3,333.333 × 80.005 = 266,683.31",
  computeAllocationValue("3333.333", "80.005").toFixed(2),
  "266683.31"
);

console.log("splitAllocation");

checkSplit("10,000 L at 33.33/33.33/33.34", "10000", thirds, [
  ["u1", "3333.000"],
  ["u2", "3333.000"],
  ["u3", "3334.000"],
]);

checkSplit("100.001 L at 33.33/33.33/33.34", "100.001", thirds, [
  ["u1", "33.330"],
  ["u2", "33.330"],
  ["u3", "33.341"],
]);

checkSplit("1 L at 33.33/33.33/33.34", "1", thirds, [
  ["u1", "0.333"],
  ["u2", "0.333"],
  ["u3", "0.334"],
]);

checkSplit(
  "1,000.001 L at 50/50, tie goes to lowest userId",
  "1000.001",
  [
    { userId: "u-a", sharePercent: "50" },
    { userId: "u-b", sharePercent: "50" },
  ],
  [
    ["u-a", "500.001"],
    ["u-b", "500.000"],
  ]
);

checkSplit(
  "1,000.001 L at 50/50, input reversed: same per-user result, input order kept",
  "1000.001",
  [
    { userId: "u-b", sharePercent: "50" },
    { userId: "u-a", sharePercent: "50" },
  ],
  [
    ["u-b", "500.000"],
    ["u-a", "500.001"],
  ]
);

checkSplit(
  "10,000 L at 60/40",
  "10000",
  [
    { userId: "u1", sharePercent: "60" },
    { userId: "u2", sharePercent: "40" },
  ],
  [
    ["u1", "6000.000"],
    ["u2", "4000.000"],
  ]
);

checkSplit(
  "1,234.567 L, single row 100",
  "1234.567",
  [{ userId: "u1", sharePercent: "100" }],
  [["u1", "1234.567"]]
);

checkSplit(
  "0.001 L at 50/50",
  "0.001",
  [
    { userId: "u-a", sharePercent: "50" },
    { userId: "u-b", sharePercent: "50" },
  ],
  [
    ["u-a", "0.001"],
    ["u-b", "0.000"],
  ]
);

console.log("splitAllocation — invalid input throws");

checkThrows("shares totalling 99.99 throw", () =>
  splitAllocation("10000", [
    { userId: "u1", sharePercent: "33.33" },
    { userId: "u2", sharePercent: "33.33" },
    { userId: "u3", sharePercent: "33.33" },
  ])
);
checkThrows("total 0 throws", () => splitAllocation("0", thirds));
checkThrows("total -5 throws", () => splitAllocation("-5", thirds));
checkThrows("total 10.0001 throws", () => splitAllocation("10.0001", thirds));
checkThrows("duplicate userId throws", () =>
  splitAllocation("10000", [
    { userId: "u1", sharePercent: "50" },
    { userId: "u1", sharePercent: "50" },
  ])
);

console.log(`\n${passed} ledger-allocation checks passed.`);
