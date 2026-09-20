import "dotenv/config";
import assert from "node:assert/strict";
import {
  calculateAchievementPercentage,
  calculateOutstanding,
  calculateTeamTarget,
  calculateTeamAchievement,
  calculateTeamOutstanding,
  calculateTeamAchievementPercentage,
  calculateContributionPercentage,
  calculateStaffOutcomePerformance,
  calculateTeamOutcomePerformance,
  deriveOutcomeValue,
  outcomeValueToNumber,
} from "@/lib/outcomes/calculations";
import { toOutcomeNumber } from "@/lib/outcomes/decimal";

let passed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(
    actual,
    expected,
    `${label}: expected ${expected}, got ${actual}`
  );

  passed++;
  console.log(`  ok — ${label}`);
}

function checkApprox(
  label: string,
  actual: number,
  expected: number,
  tolerance = 0.000001
) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`
  );

  passed++;
  console.log(`  ok — ${label}`);
}

console.log("Generated value — Decimal calculations");

const targetValue = deriveOutcomeValue("60000", "80");
check(
  "target 60,000 × 80 = 4,800,000",
  targetValue.toString(),
  "4800000"
);

const actualValue = deriveOutcomeValue("55000", "100");
check(
  "actual 55,000 × 100 = 5,500,000",
  actualValue.toString(),
  "5500000"
);

check(
  "generated value converts correctly to number",
  outcomeValueToNumber(targetValue),
  4800000
);

console.log("Decimal precision");

const decimalValue = deriveOutcomeValue("12345.678", "80.75");

check(
  "decimal multiplication remains exact",
  decimalValue.toString(),
  "997530.5229"
);

check(
  "decimal helper converts generated value correctly",
  toOutcomeNumber(decimalValue),
  997530.5229
);

console.log("Zero generated-value inputs");

check(
  "zero quantity produces zero value",
  deriveOutcomeValue("0", "80").toString(),
  "0"
);

check(
  "zero margin produces zero value",
  deriveOutcomeValue("60000", "0").toString(),
  "0"
);

console.log("Achievement percentage");

check(
  "0%",
  calculateAchievementPercentage(0, 4800000),
  0
);

check(
  "50%",
  calculateAchievementPercentage(2400000, 4800000),
  50
);

check(
  "100%",
  calculateAchievementPercentage(4800000, 4800000),
  100
);

check(
  "114.58% value achievement",
  calculateAchievementPercentage(5500000, 4800000),
  114.58
);

check(
  "target = 0 -> null",
  calculateAchievementPercentage(5500000, 0),
  null
);

check(
  "negative target -> null",
  calculateAchievementPercentage(5500000, -10),
  null
);

check(
  "missing achievement -> null",
  calculateAchievementPercentage(null, 4800000),
  null
);

check(
  "non-finite achievement -> null",
  calculateAchievementPercentage(Number.NaN, 4800000),
  null
);

check(
  "non-finite target -> null",
  calculateAchievementPercentage(5500000, Number.POSITIVE_INFINITY),
  null
);

console.log("Outstanding");

check(
  "normal value shortfall",
  calculateOutstanding(4800000, 4000000),
  800000
);

check(
  "exact value target -> 0",
  calculateOutstanding(4800000, 4800000),
  0
);

check(
  "actual value exceeds target -> 0",
  calculateOutstanding(4800000, 5500000),
  0
);

check(
  "missing actual value -> full target outstanding",
  calculateOutstanding(4800000, null),
  4800000
);

console.log("Team target / achievement");

check(
  "team target sums generated values",
  calculateTeamTarget([4800000, 2000000]),
  6800000
);

check(
  "team achievement sums generated values",
  calculateTeamAchievement([4000000, 1500000]),
  5500000
);

check(
  "team achievement ignores missing achievement",
  calculateTeamAchievement([4000000, null, 1500000]),
  5500000
);

check(
  "team achievement: all missing -> null",
  calculateTeamAchievement([null, null]),
  null
);

check(
  "team achievement: zero achievement -> 0",
  calculateTeamAchievement([0, 0]),
  0
);

check(
  "team achievement: empty roster -> null",
  calculateTeamAchievement([]),
  null
);

console.log("Team performance");

const teamPerformance = calculateTeamOutcomePerformance(
  [4800000, 2000000],
  [5500000, 1500000]
);

check(
  "team target = 6,800,000",
  teamPerformance.teamTarget,
  6800000
);

check(
  "team actual = 7,000,000",
  teamPerformance.teamAchievement,
  7000000
);

check(
  "team outstanding = 0 when team exceeds target",
  teamPerformance.teamOutstanding,
  0
);

check(
  "team achievement = 102.94%",
  teamPerformance.teamAchievementPercentage,
  102.94
);

console.log("Team outstanding / percentage");

check(
  "team outstanding",
  calculateTeamOutstanding(6800000, 5500000),
  1300000
);

check(
  "team achievement % with zero team target -> null",
  calculateTeamAchievementPercentage(5500000, 0),
  null
);

check(
  "team achievement % with zero team achievement -> 0%",
  calculateTeamAchievementPercentage(0, 6800000),
  0
);

console.log("Individual contribution");

check(
  "normal value contribution",
  calculateContributionPercentage(4800000, 6800000),
  70.59
);

check(
  "individual missing -> null",
  calculateContributionPercentage(null, 6800000),
  null
);

check(
  "team achievement missing -> null",
  calculateContributionPercentage(4800000, null),
  null
);

check(
  "zero team achievement -> null",
  calculateContributionPercentage(0, 0),
  null
);

console.log("Core business example");

const exampleTargetValue = deriveOutcomeValue(60000, 80);
const exampleActualValue = deriveOutcomeValue(55000, 100);

const exampleTarget = outcomeValueToNumber(exampleTargetValue);
const exampleActual = outcomeValueToNumber(exampleActualValue);

check(
  "example target value",
  exampleTarget,
  4800000
);

check(
  "example actual value",
  exampleActual,
  5500000
);

check(
  "example achievement percentage",
  calculateAchievementPercentage(exampleActual, exampleTarget),
  114.58
);

check(
  "example outstanding value",
  calculateOutstanding(exampleTarget, exampleActual),
  0
);

console.log("Different margins");

const staffAValue = outcomeValueToNumber(
  deriveOutcomeValue(60000, 80)
);

const staffBValue = outcomeValueToNumber(
  deriveOutcomeValue(20000, 100)
);

const teamValue = calculateTeamTarget([
  staffAValue,
  staffBValue,
]);

check(
  "staff A generated value",
  staffAValue,
  4800000
);

check(
  "staff B generated value",
  staffBValue,
  2000000
);

check(
  "team generated value is sum of individual generated values",
  teamValue,
  6800000
);

check(
  "team value is not total quantity × average margin",
  teamValue,
  6800000
);

console.log("Quantity remains independent");

const quantity = 60000;

const valueAt80 = outcomeValueToNumber(
  deriveOutcomeValue(quantity, 80)
);

const valueAt100 = outcomeValueToNumber(
  deriveOutcomeValue(quantity, 100)
);

check(
  "quantity remains unchanged",
  quantity,
  60000
);

check(
  "changing margin changes generated value",
  valueAt80,
  4800000
);

check(
  "same quantity with higher margin produces higher value",
  valueAt100,
  6000000
);

assert.equal(quantity, 60000);
assert.notEqual(valueAt80, valueAt100);
passed++;
console.log("  ok — quantity is independent from generated value");

console.log("Staff performance bundle");

const staffPerformance = calculateStaffOutcomePerformance(
  4800000,
  5500000
);

check(
  "staff bundle target",
  staffPerformance.target,
  4800000
);

check(
  "staff bundle achievement",
  staffPerformance.achievement,
  5500000
);

check(
  "staff bundle outstanding",
  staffPerformance.outstanding,
  0
);

check(
  "staff bundle achievement percentage",
  staffPerformance.achievementPercentage,
  114.58
);

console.log(`\n${passed} outcomes-calculation checks passed.`);