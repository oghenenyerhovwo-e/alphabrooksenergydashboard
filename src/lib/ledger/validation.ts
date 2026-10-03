import { Prisma } from "@/generated/prisma/browser";
import {
  isOutcomeProductActive,
  isUnitAllowedForProduct,
} from "@/config/outcomeProducts";
import {
  getLagosReportDate,
  isValidReportDate,
} from "@/lib/operations/report-date";
import type { OutcomeDecimal } from "@/lib/outcomes/decimal";
import {
  isValidOutcomeProduct,
  isValidOutcomeUnit,
} from "@/lib/outcomes/validation";
import { OUTCOMES_LEDGER_START_DATE } from "@/lib/ledger/period";

/**
 * SALES LEDGER — INPUT VALIDATION
 *
 * Pure checks for sale, allocation and target-instruction input.
 * Nothing here touches the database, checks permissions or saves.
 * String inputs are trimmed before parsing. Values with too many
 * decimal places are rejected, never rounded.
 */

const MAX_INSTRUCTION_NAME_LENGTH = 120;

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

/** Parse a Decimal / finite number / non-blank numeric string, else null. */
function parseDecimal(value: unknown): OutcomeDecimal | null {
  if (value instanceof Prisma.Decimal) {
    return value.isFinite() ? value : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? new Prisma.Decimal(value) : null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const decimal = new Prisma.Decimal(value.trim());
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

function trimmedDate(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

/* =========================================================
   QUANTITY / MARGIN
========================================================= */

/** Required; parses; > 0; at most 3 dp. null = ok, else message. */
export function validateSaleQuantity(value: unknown): string | null {
  if (isBlank(value)) return "Quantity is required.";

  const decimal = parseDecimal(value);
  if (!decimal) return "Enter a valid quantity.";
  if (!decimal.gt(0)) return "Quantity must be greater than zero.";
  if (decimal.decimalPlaces() > 3) return "Quantity can have at most 3 decimal places.";

  return null;
}

/** Required; parses; ≥ 0; at most 4 dp. 0 is allowed. null = ok, else message. */
export function validateMarginPerUnit(value: unknown): string | null {
  if (isBlank(value)) return "Margin per unit is required.";

  const decimal = parseDecimal(value);
  if (!decimal) return "Enter a valid margin per unit.";
  if (decimal.isNegative()) return "Margin per unit cannot be negative.";
  if (decimal.decimalPlaces() > 4) return "Margin per unit can have at most 4 decimal places.";

  return null;
}

/* =========================================================
   ALLOCATION ROWS
========================================================= */

export interface AllocationRowInput {
  userId: unknown;
  sharePercent: unknown;
  marginPerUnit: unknown;
}

export interface AllocationValidationResult {
  valid: boolean;
  /** Σ of parseable shares, toFixed(2); null if none parse. */
  shareTotal: string | null;
  errors: {
    form?: string;
    rows: Record<number, Partial<Record<"userId" | "sharePercent" | "marginPerUnit", string>>>;
  };
}

function shareError(value: unknown): string | null {
  if (isBlank(value)) return "Share is required.";

  const decimal = parseDecimal(value);
  if (!decimal) return "Enter a valid share percentage.";
  if (!decimal.gt(0)) return "Share must be greater than 0%.";
  if (decimal.gt(100)) return "Share cannot be more than 100%.";
  if (decimal.decimalPlaces() > 2) return "Share can have at most 2 decimal places.";

  return null;
}

/**
 * At least one row; each userId present and unique; each share > 0,
 * ≤ 100, at most 2 dp; shares total exactly 100.
 */
export function validateAllocationShares(
  rows: { userId: unknown; sharePercent: unknown }[]
): AllocationValidationResult {
  const errors: AllocationValidationResult["errors"] = { rows: {} };

  if (rows.length === 0) {
    errors.form = "Add at least one person to share this sale.";
    return { valid: false, shareTotal: null, errors };
  }

  const seenUserIds = new Set<string>();
  let total: OutcomeDecimal | null = null;

  for (const [index, row] of rows.entries()) {
    const rowErrors: AllocationValidationResult["errors"]["rows"][number] = {};

    if (typeof row.userId !== "string" || row.userId.trim().length === 0) {
      rowErrors.userId = "Select a person.";
    } else {
      const userId = row.userId.trim();
      if (seenUserIds.has(userId)) {
        rowErrors.userId = "This person already has a share in this sale.";
      }
      seenUserIds.add(userId);
    }

    const share = parseDecimal(row.sharePercent);
    if (share) {
      total = total ? total.add(share) : share;
    }

    const shareMessage = shareError(row.sharePercent);
    if (shareMessage) {
      rowErrors.sharePercent = shareMessage;
    }

    if (Object.keys(rowErrors).length > 0) {
      errors.rows[index] = rowErrors;
    }
  }

  const shareTotal = total === null ? null : total.toFixed(2);

  if (total !== null && !total.eq(100)) {
    errors.form = `Shares must total exactly 100.00% (currently ${shareTotal}%).`;
  }

  return {
    valid: errors.form === undefined && Object.keys(errors.rows).length === 0,
    shareTotal,
    errors,
  };
}

/** validateAllocationShares plus a margin per unit on every row. */
export function validateAllocationRows(rows: AllocationRowInput[]): AllocationValidationResult {
  const result = validateAllocationShares(rows);

  rows.forEach((row, index) => {
    const marginMessage = validateMarginPerUnit(row.marginPerUnit);
    if (marginMessage) {
      result.errors.rows[index] = {
        ...result.errors.rows[index],
        marginPerUnit: marginMessage,
      };
    }
  });

  result.valid =
    result.errors.form === undefined && Object.keys(result.errors.rows).length === 0;

  return result;
}

/* =========================================================
   SALE
========================================================= */

export interface SaleInput {
  product: unknown;
  invoiceNumber: unknown;
  customerName: unknown;
  paymentDate: unknown;
  totalQuantity: unknown;
  unit: unknown;
  notes?: unknown;
}

export function validateSaleInput(
  input: SaleInput,
  today: string = getLagosReportDate()
): { valid: boolean; errors: Partial<Record<keyof SaleInput, string>> } {
  const errors: Partial<Record<keyof SaleInput, string>> = {};

  if (!isValidOutcomeProduct(input.product)) {
    errors.product = "Select a valid product.";
  } else if (!isOutcomeProductActive(input.product)) {
    errors.product = `${input.product} is not active yet, so sales cannot be recorded for it.`;
  }

  if (!isValidOutcomeUnit(input.unit)) {
    errors.unit = "Select a valid unit.";
  } else if (
    isValidOutcomeProduct(input.product) &&
    !isUnitAllowedForProduct(input.product, input.unit)
  ) {
    errors.unit = `${input.unit} is not a supported unit for ${input.product}.`;
  }

  if (typeof input.invoiceNumber !== "string" || input.invoiceNumber.trim().length === 0) {
    errors.invoiceNumber = "Invoice number is required.";
  }

  if (typeof input.customerName !== "string" || input.customerName.trim().length === 0) {
    errors.customerName = "Customer name is required.";
  }

  const paymentDate = trimmedDate(input.paymentDate);
  if (!isValidReportDate(paymentDate)) {
    errors.paymentDate = "Enter a valid payment date.";
  } else if (paymentDate < OUTCOMES_LEDGER_START_DATE) {
    errors.paymentDate = "Payment date cannot be before 1 October 2026, when the sales ledger starts.";
  } else if (paymentDate > today) {
    errors.paymentDate = "Payment date cannot be in the future.";
  }

  const quantityMessage = validateSaleQuantity(input.totalQuantity);
  if (quantityMessage) {
    errors.totalQuantity = quantityMessage;
  }

  if (input.notes !== undefined && input.notes !== null && typeof input.notes !== "string") {
    errors.notes = "Notes must be text.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/* =========================================================
   TARGET INSTRUCTION
========================================================= */

export interface TargetInstructionInput {
  setByInstructionOf: unknown;
  instructionDate: unknown;
}

export function validateTargetInstruction(
  input: TargetInstructionInput,
  today: string = getLagosReportDate()
): { valid: boolean; errors: Partial<Record<keyof TargetInstructionInput, string>> } {
  const errors: Partial<Record<keyof TargetInstructionInput, string>> = {};

  if (
    typeof input.setByInstructionOf !== "string" ||
    input.setByInstructionOf.trim().length === 0
  ) {
    errors.setByInstructionOf = "Enter the name of the person who gave the instruction.";
  } else if (input.setByInstructionOf.trim().length > MAX_INSTRUCTION_NAME_LENGTH) {
    errors.setByInstructionOf = `Name cannot be longer than ${MAX_INSTRUCTION_NAME_LENGTH} characters.`;
  }

  const instructionDate = trimmedDate(input.instructionDate);
  if (!isValidReportDate(instructionDate)) {
    errors.instructionDate = "Enter a valid instruction date.";
  } else if (instructionDate > today) {
    errors.instructionDate = "Instruction date cannot be in the future.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
