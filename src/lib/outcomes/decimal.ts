import { Prisma } from "@/generated/prisma/client";

/**
 * Decimal inputs accepted by the Outcomes calculation layer.
 *
 * Prisma Decimal is the authoritative representation for financial
 * calculations. Numbers and strings are accepted at input boundaries
 * so callers can work with form values, persisted Prisma values, or
 * already-normalized values without introducing another decimal type.
 */
export type DecimalInput = Prisma.Decimal | number | string;

/**
 * Convert a supported input into a Prisma Decimal.
 *
 * This is the authoritative boundary for financial arithmetic.
 *
 * Important:
 * - JavaScript floating-point arithmetic is NOT used for the
 *   multiplication itself.
 * - Negative values are not rejected here because validation belongs
 *   to src/lib/outcomes/validation.ts.
 * - Non-finite JavaScript numbers are rejected because Decimal cannot
 *   represent NaN or Infinity as valid business values.
 */
export function toOutcomeDecimal(value: DecimalInput): Prisma.Decimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Outcome decimal input must be a finite number.");
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new TypeError("Outcome decimal input cannot be an empty string.");
  }

  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new TypeError("Outcome decimal input is invalid.");
  }
}

/**
 * Converts a DB Decimal (or already-plain number/string) to a plain JS
 * number.
 *
 * Use this only at a boundary where the existing Outcomes calculation
 * layer requires a JavaScript number or where data is being prepared
 * for display/serialization.
 */
export function toOutcomeNumber(value: DecimalInput): number {
  return toOutcomeDecimal(value).toNumber();
}

/**
 * Same as toOutcomeNumber, but passes through null/undefined for
 * "missing" values.
 */
export function toOutcomeNumberOrNull(
  value: DecimalInput | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  return toOutcomeNumber(value);
}