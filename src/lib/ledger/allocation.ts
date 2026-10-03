import { Prisma } from "@/generated/prisma/browser";
import { deriveOutcomeValue } from "@/lib/outcomes/calculations";
import {
  type DecimalInput,
  type OutcomeDecimal,
  toOutcomeDecimal,
} from "@/lib/outcomes/decimal";
import {
  validateAllocationShares,
  validateSaleQuantity,
} from "@/lib/ledger/validation";

export interface AllocationShareInput {
  userId: string;
  sharePercent: DecimalInput;
}

export interface SplitAllocationRow {
  userId: string;
  sharePercent: OutcomeDecimal;
  quantity: OutcomeDecimal;
}

/**
 * Split a sale's litres between people by share.
 *
 * 1. Each row gets total × share / 100, truncated to 3 dp.
 * 2. The remainder (total − Σ truncated) goes entirely to the row with
 *    the largest share; ties go to the lowest userId, so the result
 *    does not depend on input order.
 * 3. Σ quantities equals total exactly.
 *
 * Throws TypeError if validateSaleQuantity(total) or
 * validateAllocationShares(shares) is invalid. Output order = input order.
 */
export function splitAllocation(
  totalQuantity: DecimalInput,
  shares: AllocationShareInput[]
): SplitAllocationRow[] {
  const quantityError = validateSaleQuantity(totalQuantity);
  if (quantityError) {
    throw new TypeError(quantityError);
  }

  const shareCheck = validateAllocationShares(shares);
  if (!shareCheck.valid) {
    const rowMessages = Object.entries(shareCheck.errors.rows).flatMap(
      ([index, fields]) =>
        Object.values(fields).map((message) => `Row ${Number(index) + 1}: ${message}`)
    );
    const messages = [shareCheck.errors.form, ...rowMessages].filter(Boolean);
    throw new TypeError(messages.join(" "));
  }

  const total = toOutcomeDecimal(
    typeof totalQuantity === "string" ? totalQuantity.trim() : totalQuantity
  );

  const rows: SplitAllocationRow[] = shares.map((share) => {
    const sharePercent = toOutcomeDecimal(
      typeof share.sharePercent === "string" ? share.sharePercent.trim() : share.sharePercent
    );

    return {
      userId: share.userId,
      sharePercent,
      quantity: total
        .mul(sharePercent)
        .div(100)
        .toDecimalPlaces(3, Prisma.Decimal.ROUND_DOWN),
    };
  });

  const allocated = rows.reduce(
    (sum, row) => sum.add(row.quantity),
    toOutcomeDecimal(0)
  );
  const remainder = total.sub(allocated);

  let largest = rows[0];
  for (const row of rows.slice(1)) {
    if (
      row.sharePercent.gt(largest.sharePercent) ||
      (row.sharePercent.eq(largest.sharePercent) && row.userId < largest.userId)
    ) {
      largest = row;
    }
  }
  largest.quantity = largest.quantity.add(remainder);

  return rows;
}

/** quantity × margin, rounded ROUND_HALF_UP to 2 dp. No validation here. */
export function computeAllocationValue(
  quantity: DecimalInput,
  marginPerUnit: DecimalInput
): OutcomeDecimal {
  return deriveOutcomeValue(quantity, marginPerUnit).toDecimalPlaces(
    2,
    Prisma.Decimal.ROUND_HALF_UP
  );
}
