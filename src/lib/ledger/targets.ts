import { Prisma } from "@/generated/prisma/browser";
import { deriveOutcomeValue } from "@/lib/outcomes/calculations";
import type { DecimalInput, OutcomeDecimal } from "@/lib/outcomes/decimal";

/** quantity × margin, rounded ROUND_HALF_UP to 2 dp. Wraps deriveOutcomeValue. No validation here. */
export function computeTargetGeneratedValue(
  quantity: DecimalInput,
  marginPerUnit: DecimalInput
): OutcomeDecimal {
  return deriveOutcomeValue(quantity, marginPerUnit).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP
  );
}
