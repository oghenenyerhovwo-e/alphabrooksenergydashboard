import "dotenv/config";
import assert from "node:assert/strict";

import {
  calculateProfitabilityBreakdown,
  calculateProfitability,
  evaluateCustomerPrice,
  calculateDefaultFee,
  getProfitabilityHealthBand,
  getProfitabilityMarginFloors,
  PROFITABILITY_DEFAULTS,
  EXCEL_FILE_FINANCE_RATE_PERCENT,
  type ProfitabilityInputs,
} from "@/lib/profitability/calculations";

let passed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
  passed++;
  console.log(`  ok — ${label}`);
}

function checkApprox(label: string, actual: number, expected: number, tolerance = 0.000001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected}, got ${actual}`
  );
  passed++;
  console.log(`  ok — ${label}`);
}

console.log("Profitability — golden test against PEDDLER_PROFITAILITY_ANALYSIS.xlsx");

/*
 * The Excel file was last saved with:
 *   B5 = 7, C8 = 1750, D8:D15 = 20000, E9 = 200000, E11 = 108000,
 *   finance rate = 35%, operational loss = 0.5%, target margin = 5%.
 *
 * Saved cell values in the file:
 *   C9  = 10             C10 = 11.746575...   C11 = 5.4
 *   C12 = 8.75           C13 = 1785.896575...
 *   C14 = 89.294828...   C15 = 1875.191404...
 */
const excelFileInputs: ProfitabilityInputs = {
  creditDays: 7,
  depotPricePerLitre: 1750,
  volume: 20000,
  totalOverheads: 200000,
  totalTripExpenses: 108000,
  financeRatePercent: EXCEL_FILE_FINANCE_RATE_PERCENT,
  operationalLossPercent: 0.5,
  targetMarginPercent: 5,
};

const excelBreakdown = calculateProfitabilityBreakdown(excelFileInputs);

checkApprox("C9  overheads per litre", excelBreakdown.overheads.perLitre, 10);
checkApprox("C10 finance cost per litre", excelBreakdown.financeCost.perLitre, 11.746575342465753);
checkApprox("C11 trip expenses per litre", excelBreakdown.tripExpenses.perLitre, 5.4);
checkApprox("C12 operational loss per litre", excelBreakdown.operationalLoss.perLitre, 8.75);
checkApprox(
  "C13 Total Landing Cost per litre",
  excelBreakdown.totalLandingCost.perLitre,
  1785.896575342466
);
checkApprox("C14 margin per litre", excelBreakdown.margin.perLitre, 89.29482876712329);
checkApprox("C15 LPO Amount per litre", excelBreakdown.lpoAmount.perLitre, 1875.191404109589);

console.log("\nProfitability — app defaults (48% finance rate)");

const defaultBreakdown = calculateProfitabilityBreakdown(PROFITABILITY_DEFAULTS);

checkApprox("C10 finance cost per litre @48%", defaultBreakdown.financeCost.perLitre, 16.10958904109589);
checkApprox(
  "C13 Total Landing Cost per litre @48%",
  defaultBreakdown.totalLandingCost.perLitre,
  1790.259589041096
);
checkApprox("C15 LPO Amount per litre @48%", defaultBreakdown.lpoAmount.perLitre, 1879.772568493151);

console.log("\nProfitability — totals scale with volume");

checkApprox(
  "Total Landing Cost for 20,000 L",
  defaultBreakdown.totalLandingCost.total,
  defaultBreakdown.totalLandingCost.perLitre * 20000
);
checkApprox(
  "Total LPO for 20,000 L",
  defaultBreakdown.lpoAmount.total,
  defaultBreakdown.lpoAmount.perLitre * 20000
);

console.log("\nProfitability — customer price defaults to the suggested LPO Amount");

const resultAtSuggestedPrice = calculateProfitability(PROFITABILITY_DEFAULTS);
checkApprox(
  "customer price defaults to LPO Amount",
  resultAtSuggestedPrice.customerPriceEvaluation.customerPricePerLitre,
  resultAtSuggestedPrice.suggestedCustomerPricePerLitre
);
checkApprox(
  "margin % at the suggested price equals the target margin",
  resultAtSuggestedPrice.customerPriceEvaluation.marginPercentOfLandingCost ?? NaN,
  5
);
check(
  "suggested price is 'green'",
  resultAtSuggestedPrice.customerPriceEvaluation.healthBand,
  "green"
);

console.log("\nProfitability — health bands are relative to the target margin");

check("margin below 0% is red", getProfitabilityHealthBand(-1, 5), "red");
check("margin at 0% is orange", getProfitabilityHealthBand(0, 5), "orange");
check("margin just under half target is orange", getProfitabilityHealthBand(2.4, 5), "orange");
check("margin at half target is yellow", getProfitabilityHealthBand(2.5, 5), "yellow");
check("margin just under target is yellow", getProfitabilityHealthBand(4.9, 5), "yellow");
check("margin at target is green", getProfitabilityHealthBand(5, 5), "green");
check("margin above target is green", getProfitabilityHealthBand(9, 5), "green");
check("with a 0% target, 0% margin is green", getProfitabilityHealthBand(0, 0), "green");
check("with a 0% target, a loss is still red", getProfitabilityHealthBand(-0.5, 0), "red");

console.log("\nProfitability — a customer price below Total Landing Cost is a loss");

const lossEvaluation = evaluateCustomerPrice(
  defaultBreakdown,
  defaultBreakdown.totalLandingCost.perLitre - 10,
  PROFITABILITY_DEFAULTS.volume,
  PROFITABILITY_DEFAULTS.targetMarginPercent
);
check("price below TLC is red", lossEvaluation.healthBand, "red");
checkApprox("margin amount is negative", lossEvaluation.marginAmountPerLitre, -10);

console.log("\nProfitability — margin floors bracket the health bands");

const floors = getProfitabilityMarginFloors(
  defaultBreakdown.totalLandingCost.perLitre,
  PROFITABILITY_DEFAULTS.targetMarginPercent
);
checkApprox("break-even price equals Total Landing Cost", floors.breakEvenPrice, defaultBreakdown.totalLandingCost.perLitre);
checkApprox("target price equals the suggested LPO Amount", floors.targetPrice, defaultBreakdown.lpoAmount.perLitre);
assert.ok(floors.fairPrice > floors.breakEvenPrice && floors.fairPrice < floors.targetPrice);
passed++;
console.log("  ok — fair price sits strictly between break-even and target");

console.log("\nProfitability — default fee for credit buyers");

const fee = calculateDefaultFee(1879.772568493151, 48, 20000);
checkApprox("per litre per day", fee.perLitrePerDay, 2.472029679114280);
checkApprox("total per day for 20,000 L", fee.totalPerDay, 49440.59358228561);

console.log("\nProfitability — volume must be greater than zero");

assert.throws(() => calculateProfitabilityBreakdown({ ...PROFITABILITY_DEFAULTS, volume: 0 }), RangeError);
passed++;
console.log("  ok — zero volume throws");

console.log(`\n${passed} checks passed.`);