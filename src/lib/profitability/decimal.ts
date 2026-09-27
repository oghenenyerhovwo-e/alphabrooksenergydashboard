import { Prisma } from "@/generated/prisma/browser";

/**
 * TypeScript representation of the Prisma Decimal class exposed
 * by the browser-safe Prisma namespace.
 *
 * Mirrors src/lib/outcomes/decimal.ts. Kept as its own copy, rather
 * than shared, so the Profitability domain does not depend on the
 * Outcomes domain for something as basic as number handling.
 */
export type ProfitabilityDecimal = InstanceType<typeof Prisma.Decimal>;

export type DecimalInput = ProfitabilityDecimal | number | string;

/**
 * Convert a supported input into a Prisma Decimal.
 *
 * This is the authoritative boundary for profitability arithmetic:
 * every multiplication/division in this domain goes through Decimal,
 * never plain JS floating point.
 */
export function toProfitabilityDecimal(value: DecimalInput): ProfitabilityDecimal {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Profitability decimal input must be a finite number.");
  }

  if (typeof value === "string" && value.trim().length === 0) {
    throw new TypeError("Profitability decimal input cannot be an empty string.");
  }

  try {
    return new Prisma.Decimal(value);
  } catch {
    throw new TypeError("Profitability decimal input is invalid.");
  }
}

export function toProfitabilityNumber(value: DecimalInput): number {
  return toProfitabilityDecimal(value).toNumber();
}

/**
 * Round a display value to two decimal places.
 *
 * Used ONLY at the presentation boundary. Every intermediate result in
 * this module stays full-precision Decimal until it is shown or saved.
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}