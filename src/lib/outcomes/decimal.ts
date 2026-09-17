import { Prisma } from "@/generated/prisma/client";

/**
 * Outcomes quantities are stored as Prisma Decimal (Postgres NUMERIC).
 * See Phase 1 completion report §4 for why this deviates from the
 * app's existing Float convention.
 *
 * Prisma's Decimal (decimal.js) does not serialize to JSON as a plain
 * number and must never be handed to JSON.stringify / a client
 * component / an API response directly. Always pass values through
 * toOutcomeNumber() at the boundary between the database layer and
 * anything that will be serialized, rendered, or used in arithmetic
 * outside this module.
 */
export type DecimalInput = Prisma.Decimal | number | string;

/** Converts a DB Decimal (or already-plain number/string) to a plain JS number. */
export function toOutcomeNumber(value: DecimalInput): number {
  if (typeof value === "number") return value;
  return Number(value.toString());
}

/** Same as toOutcomeNumber, but passes through null/undefined for "missing" values. */
export function toOutcomeNumberOrNull(
  value: DecimalInput | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  return toOutcomeNumber(value);
}