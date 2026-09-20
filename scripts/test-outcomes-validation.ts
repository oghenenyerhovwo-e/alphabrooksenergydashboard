import "dotenv/config";
import assert from "node:assert/strict";

import {
  isValidOutcomeProduct,
  isValidOutcomeUnit,
  isValidOutcomeDecimal,
  isValidNonNegativeDecimal,
  isValidOutcomeQuantity,
  isValidOutcomeMargin,
  validateOutcomeFact,
  validateOutcomeTarget,
  validateOutcomeAchievement,
} from "@/lib/outcomes/validation";

let passed = 0;

function check(
  label: string,
  actual: unknown,
  expected: unknown
) {
  assert.deepStrictEqual(
    actual,
    expected,
    `${label}: expected ${expected}, got ${actual}`
  );

  passed++;

  console.log(`  ok — ${label}`);
}

function checkTrue(
  label: string,
  actual: boolean
) {
  check(label, actual, true);
}

function checkFalse(
  label: string,
  actual: boolean
) {
  check(label, actual, false);
}

/* =========================================================
   BASIC PRODUCT VALIDATION
========================================================= */

console.log("Product validation");

checkTrue(
  "AGO is a valid product",
  isValidOutcomeProduct("AGO")
);

checkTrue(
  "CNG is a valid product",
  isValidOutcomeProduct("CNG")
);

checkTrue(
  "LPG is a valid product",
  isValidOutcomeProduct("LPG")
);

checkFalse(
  "invalid product rejected",
  isValidOutcomeProduct("DIESEL")
);

checkFalse(
  "null product rejected",
  isValidOutcomeProduct(null)
);

/* =========================================================
   BASIC UNIT VALIDATION
========================================================= */

console.log("Unit validation");

checkTrue(
  "LITRES is a valid unit",
  isValidOutcomeUnit("LITRES")
);

checkTrue(
  "SCM is a valid unit",
  isValidOutcomeUnit("SCM")
);

checkTrue(
  "KG is a valid unit",
  isValidOutcomeUnit("KG")
);

checkTrue(
  "TONNES is a valid unit",
  isValidOutcomeUnit("TONNES")
);

checkTrue(
  "UNITS is a valid unit",
  isValidOutcomeUnit("UNITS")
);

checkFalse(
  "invalid unit rejected",
  isValidOutcomeUnit("GALLONS")
);

/* =========================================================
   DECIMAL INPUT VALIDATION
========================================================= */

console.log("Decimal-safe input validation");

checkTrue(
  "integer string is Decimal-compatible",
  isValidOutcomeDecimal("60000")
);

checkTrue(
  "decimal string is Decimal-compatible",
  isValidOutcomeDecimal("80.50")
);

checkTrue(
  "zero string is Decimal-compatible",
  isValidOutcomeDecimal("0")
);

checkTrue(
  "positive number is Decimal-compatible",
  isValidOutcomeDecimal(60000)
);

checkTrue(
  "zero number is Decimal-compatible",
  isValidOutcomeDecimal(0)
);

checkFalse(
  "empty string rejected",
  isValidOutcomeDecimal("")
);

checkFalse(
  "whitespace rejected",
  isValidOutcomeDecimal("   ")
);

checkFalse(
  "malformed numeric string rejected",
  isValidOutcomeDecimal("abc")
);

checkFalse(
  "NaN rejected",
  isValidOutcomeDecimal(Number.NaN)
);

checkFalse(
  "Infinity rejected",
  isValidOutcomeDecimal(Number.POSITIVE_INFINITY)
);

/* =========================================================
   NON-NEGATIVE DECIMAL VALIDATION
========================================================= */

console.log("Non-negative Decimal validation");

checkTrue(
  "zero is valid",
  isValidNonNegativeDecimal("0")
);

checkTrue(
  "positive integer is valid",
  isValidNonNegativeDecimal("60000")
);

checkTrue(
  "positive decimal is valid",
  isValidNonNegativeDecimal("80.50")
);

checkFalse(
  "negative integer rejected",
  isValidNonNegativeDecimal("-1")
);

checkFalse(
  "negative decimal rejected",
  isValidNonNegativeDecimal("-80.50")
);

checkFalse(
  "malformed decimal rejected",
  isValidNonNegativeDecimal("80.50abc")
);

/* =========================================================
   QUANTITY VALIDATION
========================================================= */

console.log("Quantity validation");

checkTrue(
  "zero quantity valid",
  isValidOutcomeQuantity(0)
);

checkTrue(
  "one quantity valid",
  isValidOutcomeQuantity(1)
);

checkTrue(
  "20,000 quantity valid",
  isValidOutcomeQuantity("20000")
);

checkTrue(
  "60,000 quantity valid",
  isValidOutcomeQuantity("60000")
);

checkTrue(
  "decimal quantity valid",
  isValidOutcomeQuantity("60000.125")
);

checkFalse(
  "negative quantity rejected",
  isValidOutcomeQuantity("-1")
);

checkFalse(
  "negative decimal quantity rejected",
  isValidOutcomeQuantity("-100.50")
);

checkFalse(
  "malformed quantity rejected",
  isValidOutcomeQuantity("60abc")
);

checkFalse(
  "empty quantity rejected",
  isValidOutcomeQuantity("")
);

checkFalse(
  "null quantity rejected",
  isValidOutcomeQuantity(null)
);

checkFalse(
  "undefined quantity rejected",
  isValidOutcomeQuantity(undefined)
);

/* =========================================================
   MARGIN VALIDATION
========================================================= */

console.log("Margin validation");

checkTrue(
  "zero margin valid",
  isValidOutcomeMargin(0)
);

checkTrue(
  "80 margin valid",
  isValidOutcomeMargin("80")
);

checkTrue(
  "100 margin valid",
  isValidOutcomeMargin("100")
);

checkTrue(
  "80.50 margin valid",
  isValidOutcomeMargin("80.50")
);

checkTrue(
  "100.25 margin valid",
  isValidOutcomeMargin("100.25")
);

checkFalse(
  "negative margin rejected",
  isValidOutcomeMargin("-80")
);

checkFalse(
  "negative decimal margin rejected",
  isValidOutcomeMargin("-80.50")
);

checkFalse(
  "malformed margin rejected",
  isValidOutcomeMargin("abc")
);

checkFalse(
  "empty margin rejected",
  isValidOutcomeMargin("")
);

checkFalse(
  "null margin rejected",
  isValidOutcomeMargin(null)
);

checkFalse(
  "undefined margin rejected",
  isValidOutcomeMargin(undefined)
);

/* =========================================================
   COMPLETE VALID TARGET
========================================================= */

console.log("Complete target validation");

const validTarget = validateOutcomeTarget({
  userId: "staff-1",
  product: "AGO",
  year: 2026,
  month: 9,
  quantity: "60000",
  marginPerUnit: "80",
  unit: "LITRES",
});

check(
  "valid target is accepted",
  validTarget.valid,
  true
);

check(
  "valid target has no errors",
  validTarget.errors,
  {}
);

/* =========================================================
   COMPLETE VALID ACHIEVEMENT
========================================================= */

console.log("Complete achievement validation");

const validAchievement =
  validateOutcomeAchievement({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "50000",
    marginPerUnit: "100",
    unit: "LITRES",
  });

check(
  "valid achievement is accepted",
  validAchievement.valid,
  true
);

check(
  "valid achievement has no errors",
  validAchievement.errors,
  {}
);

/* =========================================================
   MISSING QUANTITY
========================================================= */

console.log("Missing quantity");

const missingQuantity =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "missing quantity rejected",
  missingQuantity.valid,
  false
);

check(
  "missing quantity error",
  missingQuantity.errors.quantity,
  "Quantity is required."
);

/* =========================================================
   MISSING MARGIN
========================================================= */

console.log("Missing margin");

const missingMargin =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "",
    unit: "LITRES",
  });

check(
  "missing margin rejected",
  missingMargin.valid,
  false
);

check(
  "missing margin error",
  missingMargin.errors.marginPerUnit,
  "Margin per unit is required."
);

/* =========================================================
   ZERO QUANTITY
========================================================= */

console.log("Zero quantity");

const zeroQuantity =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "0",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "zero quantity is valid",
  zeroQuantity.valid,
  true
);

/* =========================================================
   ZERO MARGIN
========================================================= */

console.log("Zero margin");

const zeroMargin =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "0",
    unit: "LITRES",
  });

check(
  "zero margin is valid",
  zeroMargin.valid,
  true
);

/* =========================================================
   NEGATIVE QUANTITY
========================================================= */

console.log("Negative quantity");

const negativeQuantity =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "-1",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "negative quantity rejected",
  negativeQuantity.valid,
  false
);

check(
  "negative quantity error",
  negativeQuantity.errors.quantity,
  "Enter a valid, non-negative quantity."
);

/* =========================================================
   NEGATIVE MARGIN
========================================================= */

console.log("Negative margin");

const negativeMargin =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "-80",
    unit: "LITRES",
  });

check(
  "negative margin rejected",
  negativeMargin.valid,
  false
);

check(
  "negative margin error",
  negativeMargin.errors.marginPerUnit,
  "Enter a valid, non-negative margin per unit."
);

/* =========================================================
   MALFORMED QUANTITY
========================================================= */

console.log("Malformed quantity");

const malformedQuantity =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60abc",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "malformed quantity rejected",
  malformedQuantity.valid,
  false
);

check(
  "malformed quantity error",
  malformedQuantity.errors.quantity,
  "Enter a valid, non-negative quantity."
);

/* =========================================================
   MALFORMED MARGIN
========================================================= */

console.log("Malformed margin");

const malformedMargin =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80abc",
    unit: "LITRES",
  });

check(
  "malformed margin rejected",
  malformedMargin.valid,
  false
);

check(
  "malformed margin error",
  malformedMargin.errors.marginPerUnit,
  "Enter a valid, non-negative margin per unit."
);

/* =========================================================
   INVALID PRODUCT
========================================================= */

console.log("Invalid product");

const invalidProduct =
  validateOutcomeFact({
    userId: "staff-1",
    product: "INVALID",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "invalid product rejected",
  invalidProduct.valid,
  false
);

check(
  "invalid product error",
  invalidProduct.errors.product,
  "Select a valid product."
);

/* =========================================================
   INVALID UNIT
========================================================= */

console.log("Invalid unit");

const invalidUnit =
  validateOutcomeFact({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "GALLONS",
  });

check(
  "invalid unit rejected",
  invalidUnit.valid,
  false
);

check(
  "invalid unit error",
  invalidUnit.errors.unit,
  "Select a valid measurement unit."
);

/* =========================================================
   PRODUCT / UNIT MISMATCH
========================================================= */

console.log("Product / unit compatibility");

const invalidProductUnit =
  validateOutcomeFact({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "KG",
  });

check(
  "unsupported AGO unit rejected",
  invalidProductUnit.valid,
  false
);

check(
  "product/unit compatibility error",
  invalidProductUnit.errors.unit,
  "KG is not a supported unit for AGO."
);

/* =========================================================
   INVALID YEAR
========================================================= */

console.log("Invalid year");

const invalidYear =
  validateOutcomeFact({
    userId: "staff-1",
    product: "AGO",
    year: 1999,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "invalid year rejected",
  invalidYear.valid,
  false
);

check(
  "invalid year error",
  invalidYear.errors.year,
  "Enter a valid year."
);

/* =========================================================
   INVALID MONTH
========================================================= */

console.log("Invalid month");

const invalidMonth =
  validateOutcomeFact({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 13,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "invalid month rejected",
  invalidMonth.valid,
  false
);

check(
  "invalid month error",
  invalidMonth.errors.month,
  "Enter a valid month (1–12)."
);

/* =========================================================
   MISSING USER
========================================================= */

console.log("Missing staff member");

const missingUser =
  validateOutcomeFact({
    userId: "",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "60000",
    marginPerUnit: "80",
    unit: "LITRES",
  });

check(
  "missing staff member rejected",
  missingUser.valid,
  false
);

check(
  "missing staff member error",
  missingUser.errors.userId,
  "A valid staff member is required."
);

/* =========================================================
   WHITESPACE NUMERIC INPUT
========================================================= */

console.log("Whitespace numeric input");

const whitespaceValues =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: " 60000 ",
    marginPerUnit: " 80.50 ",
    unit: "LITRES",
  });

check(
  "whitespace around valid quantity/margin is accepted",
  whitespaceValues.valid,
  true
);

/* =========================================================
   LARGE VALUES
========================================================= */

console.log("Large values");

const largeValues =
  validateOutcomeTarget({
    userId: "staff-1",
    product: "AGO",
    year: 2026,
    month: 9,
    quantity: "999999999999999.999",
    marginPerUnit: "999999999999.9999",
    unit: "LITRES",
  });

check(
  "large Decimal-compatible values are accepted",
  largeValues.valid,
  true
);

/* =========================================================
   SUMMARY
========================================================= */

console.log(
  `\n${passed} outcomes-validation checks passed.`
);