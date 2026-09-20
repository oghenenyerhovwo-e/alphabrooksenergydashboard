import type {
  OutcomeProduct,
  OutcomeUnit,
} from "@/generated/prisma/client";

import {
  isValidOutcomeMonth,
  isValidOutcomeYear,
} from "@/lib/outcomes/period";

import {
  isUnitAllowedForProduct,
} from "@/config/outcomeProducts";

import {
  Prisma,
} from "@/generated/prisma/client";

/* =========================================================
   VALID OUTCOMES ENUM VALUES
========================================================= */

const VALID_OUTCOME_PRODUCTS: readonly OutcomeProduct[] = [
  "AGO",
  "CNG",
  "LPG",
];

const VALID_OUTCOME_UNITS: readonly OutcomeUnit[] = [
  "LITRES",
  "SCM",
  "KG",
  "TONNES",
  "UNITS",
];

/* =========================================================
   BASIC ENUM VALIDATION
========================================================= */

/**
 * Determines whether an unknown value is a valid Outcomes product.
 *
 * This validates that the value belongs to the application's
 * OutcomeProduct enum.
 *
 * Product activation/dormancy is intentionally NOT handled here.
 * That remains the responsibility of the product configuration /
 * server-action layer.
 */
export function isValidOutcomeProduct(
  value: unknown
): value is OutcomeProduct {
  return (
    typeof value === "string" &&
    (
      VALID_OUTCOME_PRODUCTS as readonly string[]
    ).includes(value)
  );
}

/**
 * Determines whether an unknown value is a valid Outcomes unit.
 *
 * This validates the application's known OutcomeUnit values.
 *
 * Product-specific compatibility is checked separately by
 * isUnitAllowedForProduct().
 */
export function isValidOutcomeUnit(
  value: unknown
): value is OutcomeUnit {
  return (
    typeof value === "string" &&
    (
      VALID_OUTCOME_UNITS as readonly string[]
    ).includes(value)
  );
}

/* =========================================================
   DECIMAL-SAFE NUMERIC VALIDATION
========================================================= */

/**
 * Values accepted at the Outcomes numeric input boundary.
 *
 * Form submissions commonly arrive as strings, while server-side
 * code may already have numbers or Prisma Decimal instances.
 */
export type OutcomeNumericInput =
  | Prisma.Decimal
  | number
  | string;

/**
 * Determines whether a value is a valid Decimal-compatible numeric
 * input.
 *
 * Important:
 * - This does NOT use parseFloat().
 * - This does NOT use Number() as the authoritative parser.
 * - Prisma.Decimal performs the actual numeric representation check.
 * - JavaScript numbers must still be finite.
 *
 * This function intentionally does not enforce non-negative values.
 * That responsibility belongs to isValidNonNegativeDecimal().
 */
export function isValidOutcomeDecimal(
  value: unknown
): value is OutcomeNumericInput {
  if (value instanceof Prisma.Decimal) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return false;
  }

  try {
    new Prisma.Decimal(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines whether an input is a valid, non-negative Decimal.
 *
 * Zero is valid.
 *
 * Missing values, malformed values, and negative values are invalid.
 */
export function isValidNonNegativeDecimal(
  value: unknown
): value is OutcomeNumericInput {
  if (!isValidOutcomeDecimal(value)) {
    return false;
  }

  try {
    const decimal = new Prisma.Decimal(value);

    return !decimal.isNegative();
  } catch {
    return false;
  }
}

/* =========================================================
   QUANTITY VALIDATION
========================================================= */

/**
 * Target and achievement quantities must be:
 *
 * - present
 * - Decimal-compatible
 * - finite when supplied as a JavaScript number
 * - non-negative
 *
 * Zero is valid.
 *
 * This function accepts both form strings and Decimal/number values
 * because validation is intended to be usable at the server boundary.
 */
export function isValidOutcomeQuantity(
  value: unknown
): value is OutcomeNumericInput {
  return isValidNonNegativeDecimal(value);
}

/* =========================================================
   MARGIN VALIDATION
========================================================= */

/**
 * Target and achievement margins per unit must be:
 *
 * - present
 * - Decimal-compatible
 * - non-negative
 *
 * Zero is valid.
 *
 * Validation does NOT calculate generated value.
 */
export function isValidOutcomeMargin(
  value: unknown
): value is OutcomeNumericInput {
  return isValidNonNegativeDecimal(value);
}

/* =========================================================
   SHARED INPUT TYPES
========================================================= */

/**
 * Shared logical input used by target and achievement validation.
 *
 * `quantity` represents the physical outcome quantity.
 *
 * `marginPerUnit` represents the margin associated with that quantity.
 *
 * The generated monetary value is intentionally absent because it is
 * derived later by the Phase 2 calculation layer.
 */
export interface OutcomeFactInput {
  userId: string;
  product: OutcomeProduct;
  year: number;
  month: number;
  quantity: OutcomeNumericInput;
  marginPerUnit: OutcomeNumericInput;
  unit: OutcomeUnit;
}

/**
 * Validation errors are keyed to the actual logical input fields.
 *
 * This keeps target and achievement validation structurally identical
 * while allowing the caller to map those errors to its own UI/action
 * field names later.
 */
export interface OutcomeValidationResult {
  valid: boolean;
  errors: Partial<
    Record<keyof OutcomeFactInput, string>
  >;
}

/* =========================================================
   SHARED QUANTITY VALIDATION
========================================================= */

/**
 * Validates a required quantity.
 *
 * Missing:
 * - undefined
 * - null
 * - empty string
 * - whitespace-only string
 *
 * are reported as "required".
 *
 * Zero remains valid.
 */
function validateRequiredQuantity(
  value: unknown,
  errors: OutcomeValidationResult["errors"]
): void {
  if (
    value === undefined ||
    value === null ||
    (
      typeof value === "string" &&
      value.trim().length === 0
    )
  ) {
    errors.quantity =
      "Quantity is required.";

    return;
  }

  if (!isValidOutcomeQuantity(value)) {
    errors.quantity =
      "Enter a valid, non-negative quantity.";
  }
}

/* =========================================================
   SHARED MARGIN VALIDATION
========================================================= */

/**
 * Validates a required margin per unit.
 *
 * Missing:
 * - undefined
 * - null
 * - empty string
 * - whitespace-only string
 *
 * are reported as "required".
 *
 * Zero remains valid.
 */
function validateRequiredMargin(
  value: unknown,
  errors: OutcomeValidationResult["errors"]
): void {
  if (
    value === undefined ||
    value === null ||
    (
      typeof value === "string" &&
      value.trim().length === 0
    )
  ) {
    errors.marginPerUnit =
      "Margin per unit is required.";

    return;
  }

  if (!isValidOutcomeMargin(value)) {
    errors.marginPerUnit =
      "Enter a valid, non-negative margin per unit.";
  }
}

/* =========================================================
   SHARED OUTCOME FACT VALIDATION
========================================================= */

/**
 * Shared validation for OutcomeTarget and OutcomeAchievement.
 *
 * This function validates the common shape of both business facts:
 *
 * - staff member
 * - product
 * - period
 * - quantity
 * - margin per unit
 * - measurement unit
 *
 * It does NOT:
 *
 * - calculate monetary value
 * - access the database
 * - verify that the user exists
 * - determine whether a product is active/dormant
 * - determine whether the caller is authorized
 * - save anything
 *
 * Those responsibilities belong to other layers.
 */
export function validateOutcomeFact(input: {
  userId: unknown;
  product: unknown;
  year: unknown;
  month: unknown;
  quantity: unknown;
  marginPerUnit: unknown;
  unit: unknown;
}): OutcomeValidationResult {
  const errors: OutcomeValidationResult["errors"] = {};

  /* -------------------------------------------------------
     STAFF MEMBER
  ------------------------------------------------------- */

  if (
    typeof input.userId !== "string" ||
    input.userId.trim().length === 0
  ) {
    errors.userId =
      "A valid staff member is required.";
  }

  /* -------------------------------------------------------
     PRODUCT
  ------------------------------------------------------- */

  if (!isValidOutcomeProduct(input.product)) {
    errors.product =
      "Select a valid product.";
  }

  /* -------------------------------------------------------
     PERIOD
  ------------------------------------------------------- */

  if (!isValidOutcomeYear(input.year)) {
    errors.year =
      "Enter a valid year.";
  }

  if (!isValidOutcomeMonth(input.month)) {
    errors.month =
      "Enter a valid month (1–12).";
  }

  /* -------------------------------------------------------
     QUANTITY
  ------------------------------------------------------- */

  validateRequiredQuantity(
    input.quantity,
    errors
  );

  /* -------------------------------------------------------
     MARGIN
  ------------------------------------------------------- */

  validateRequiredMargin(
    input.marginPerUnit,
    errors
  );

  /* -------------------------------------------------------
     UNIT
  ------------------------------------------------------- */

  if (!isValidOutcomeUnit(input.unit)) {
    errors.unit =
      "Select a valid measurement unit.";
  }

  /* -------------------------------------------------------
     PRODUCT / UNIT COMPATIBILITY
  ------------------------------------------------------- */

  if (
    isValidOutcomeProduct(input.product) &&
    isValidOutcomeUnit(input.unit) &&
    !isUnitAllowedForProduct(
      input.product,
      input.unit
    )
  ) {
    errors.unit =
      `${input.unit} is not a supported unit for ${input.product}.`;
  }

  return {
    valid:
      Object.keys(errors).length === 0,
    errors,
  };
}

/* =========================================================
   TARGET VALIDATION
========================================================= */

/**
 * Validates a monthly Outcomes target.
 *
 * Target validation intentionally delegates to the shared fact
 * validation because target and achievement have the same input
 * validity rules.
 */
export function validateOutcomeTarget(input: {
  userId: unknown;
  product: unknown;
  year: unknown;
  month: unknown;
  quantity: unknown;
  marginPerUnit: unknown;
  unit: unknown;
}): OutcomeValidationResult {
  return validateOutcomeFact(input);
}

/* =========================================================
   ACHIEVEMENT VALIDATION
========================================================= */

/**
 * Validates a monthly Outcomes achievement.
 *
 * Achievement validation intentionally delegates to the shared fact
 * validation because target and achievement have the same input
 * validity rules.
 */
export function validateOutcomeAchievement(input: {
  userId: unknown;
  product: unknown;
  year: unknown;
  month: unknown;
  quantity: unknown;
  marginPerUnit: unknown;
  unit: unknown;
}): OutcomeValidationResult {
  return validateOutcomeFact(input);
}