import "dotenv/config";
import assert from "node:assert/strict";
import { OUTCOME_PRODUCT_STATUS, isOutcomeProductActive } from "@/config/outcomeProducts";
import { isValidOutcomeMonth, isValidOutcomeYear, MIN_OUTCOME_YEAR } from "@/lib/outcomes/period";
import { isEligibleForOutcomeTargets } from "@/lib/outcomes/eligibility";

let passed = 0;
function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  passed++;
  console.log(`  ok — ${label}`);
}

console.log("Product state");
check("AGO active", OUTCOME_PRODUCT_STATUS.AGO, "ACTIVE");
check("CNG dormant", OUTCOME_PRODUCT_STATUS.CNG, "DORMANT");
check("LPG dormant", OUTCOME_PRODUCT_STATUS.LPG, "DORMANT");
check("isOutcomeProductActive(AGO)", isOutcomeProductActive("AGO"), true);
check("isOutcomeProductActive(CNG)", isOutcomeProductActive("CNG"), false);

console.log("Period validation");
check("month 1 valid", isValidOutcomeMonth(1), true);
check("month 12 valid", isValidOutcomeMonth(12), true);
check("month 0 invalid", isValidOutcomeMonth(0), false);
check("month 13 invalid", isValidOutcomeMonth(13), false);
check(`year ${MIN_OUTCOME_YEAR} valid`, isValidOutcomeYear(MIN_OUTCOME_YEAR), true);
check("year 2027 valid (future-year extensibility)", isValidOutcomeYear(2027), true);
check("year 2028 valid (future-year extensibility)", isValidOutcomeYear(2028), true);
check("year 2035 valid (not hardcoded to 2026-2028)", isValidOutcomeYear(2035), true);
check("year 1999 invalid", isValidOutcomeYear(1999), false);

console.log("Eligible staff rule (no MD invented)");
check(
  "ACTIVE BUSINESS_DEVELOPMENT eligible",
  isEligibleForOutcomeTargets({ role: "BUSINESS_DEVELOPMENT", status: "ACTIVE" }),
  true
);
check("ACTIVE SALES eligible", isEligibleForOutcomeTargets({ role: "SALES", status: "ACTIVE" }), true);
check("ACTIVE ADMIN not eligible", isEligibleForOutcomeTargets({ role: "ADMIN", status: "ACTIVE" }), false);
check(
  "ACTIVE OPERATIONS not eligible",
  isEligibleForOutcomeTargets({ role: "OPERATIONS", status: "ACTIVE" }),
  false
);
check("ACTIVE FINANCE not eligible", isEligibleForOutcomeTargets({ role: "FINANCE", status: "ACTIVE" }), false);
check(
  "INACTIVE SALES not eligible (status gates role)",
  isEligibleForOutcomeTargets({ role: "SALES", status: "INACTIVE" }),
  false
);

console.log(`\n${passed} outcomes-domain checks passed.`);