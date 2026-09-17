import type { OutcomeProduct, OutcomeUnit } from "@/generated/prisma/client";
import { isValidOutcomeMonth, isValidOutcomeYear } from "@/lib/outcomes/period";
import { isUnitAllowedForProduct } from "@/config/outcomeProducts";

const VALID_OUTCOME_PRODUCTS: readonly OutcomeProduct[] = ["AGO", "CNG", "LPG"];
const VALID_OUTCOME_UNITS: readonly OutcomeUnit[] = ["LITRES", "SCM", "KG", "TONNES", "UNITS"];

export function isValidOutcomeProduct(value: unknown): value is OutcomeProduct {
  return typeof value === "string" && (VALID_OUTCOME_PRODUCTS as readonly string[]).includes(value);
}

export function isValidOutcomeUnit(value: unknown): value is OutcomeUnit {
  return typeof value === "string" && (VALID_OUTCOME_UNITS as readonly string[]).includes(value);
}

/**
 * Target/achievement quantities: finite, non-negative. The business
 * domain gives no case for a negative litres/SCM/kg/tonnes figure, so
 * negatives are rejected outright rather than silently clamped to 0 —
 * invalid input must be rejected, never coerced (spec §12).
 */
export function isValidOutcomeQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export interface OutcomeFactInput {
  userId: string;
  product: OutcomeProduct;
  year: number;
  month: number;
  value: number;
  unit: OutcomeUnit;
}

export interface OutcomeValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof OutcomeFactInput, string>>;
}

/**
 * Shared validation for both OutcomeTarget and OutcomeAchievement
 * inputs — the two facts have identical shape validation rules even
 * though they remain separate database records and separate business
 * concepts (spec §16). userId existence against the User table is
 * deliberately NOT checked here (that needs a DB round-trip); callers
 * should verify the user exists/is eligible separately.
 */
export function validateOutcomeFact(input: {
  userId: unknown;
  product: unknown;
  year: unknown;
  month: unknown;
  value: unknown;
  unit: unknown;
}): OutcomeValidationResult {
  const errors: OutcomeValidationResult["errors"] = {};

  if (typeof input.userId !== "string" || input.userId.trim().length === 0) {
    errors.userId = "A valid staff member is required.";
  }
  if (!isValidOutcomeProduct(input.product)) {
    errors.product = "Select a valid product.";
  }
  if (!isValidOutcomeYear(input.year)) {
    errors.year = "Enter a valid year.";
  }
  if (!isValidOutcomeMonth(input.month)) {
    errors.month = "Enter a valid month (1–12).";
  }
  if (!isValidOutcomeQuantity(input.value)) {
    errors.value = "Enter a valid, non-negative quantity.";
  }
  if (!isValidOutcomeUnit(input.unit)) {
    errors.unit = "Select a valid measurement unit.";
  }

  if (
    isValidOutcomeProduct(input.product) &&
    isValidOutcomeUnit(input.unit) &&
    !isUnitAllowedForProduct(input.product, input.unit)
  ) {
    errors.unit = `${input.unit} is not a supported unit for ${input.product}.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}