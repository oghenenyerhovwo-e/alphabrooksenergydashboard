import assert from "node:assert/strict";
import {
  type AllocationRowInput,
  type SaleInput,
  validateAllocationRows,
  validateSaleInput,
  validateTargetInstruction,
} from "@/lib/ledger/validation";

let passed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  assert.deepStrictEqual(
    actual,
    expected,
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );

  passed++;
  console.log(`  ok — ${label}`);
}

/** Rows from [userId, sharePercent] pairs, margin "80" unless given. */
function rows(...pairs: Array<[unknown, unknown, unknown?]>): AllocationRowInput[] {
  return pairs.map(([userId, sharePercent, marginPerUnit = "80"]) => ({
    userId,
    sharePercent,
    marginPerUnit,
  }));
}

const TODAY = "2026-10-15";

console.log("Allocation — valid shares");

check("single row 100.00 valid", validateAllocationRows(rows(["u1", "100.00"])).valid, true);
check('single row "100" valid', validateAllocationRows(rows(["u1", "100"])).valid, true);
check("50/50 valid", validateAllocationRows(rows(["u1", "50"], ["u2", "50"])).valid, true);

console.log("Allocation — share total must be exactly 100");

const under = validateAllocationRows(rows(["u1", "33.33"], ["u2", "33.33"], ["u3", "33.33"]));
check("99.99 invalid", under.valid, false);
check('99.99 shareTotal "99.99"', under.shareTotal, "99.99");
check("99.99 form error mentions 99.99", under.errors.form?.includes("99.99"), true);

check(
  "100.01 invalid",
  validateAllocationRows(rows(["u1", "33.33"], ["u2", "33.33"], ["u3", "33.35"])).valid,
  false
);

console.log("Allocation — share range and precision");

const zero = validateAllocationRows(rows(["u1", "0"], ["u2", "100"]));
check("share 0 invalid", zero.valid, false);
check("share 0 has a row error", typeof zero.errors.rows[0]?.sharePercent, "string");

const negative = validateAllocationRows(rows(["u1", "-10"], ["u2", "60"], ["u3", "50"]));
check("-10/60/50 invalid", negative.valid, false);
check("-10/60/50 row 0 error", typeof negative.errors.rows[0]?.sharePercent, "string");

check("single share 100.01 invalid", validateAllocationRows(rows(["u1", "100.01"])).valid, false);

const threeDp = validateAllocationRows(rows(["u1", "33.333"], ["u2", "33.333"], ["u3", "33.334"]));
check("33.333 invalid even though shares total 100", threeDp.valid, false);
check("33.333 has a row error", typeof threeDp.errors.rows[0]?.sharePercent, "string");

check('share "abc" invalid', validateAllocationRows(rows(["u1", "abc"])).valid, false);
check('share "" invalid', validateAllocationRows(rows(["u1", ""])).valid, false);
check('" 50 " + "50" valid', validateAllocationRows(rows(["u1", " 50 "], ["u2", "50"])).valid, true);

console.log("Allocation — people");

const duplicate = validateAllocationRows(rows(["u1", "50"], ["u1", "50"]));
check("duplicate userId invalid", duplicate.valid, false);
check(
  "duplicate: row 1 flagged",
  duplicate.errors.rows[1]?.userId,
  "This person already has a share in this sale."
);
check("duplicate: row 0 not flagged", duplicate.errors.rows[0], undefined);

check("empty userId invalid", validateAllocationRows(rows(["", "100"])).valid, false);

const empty = validateAllocationRows([]);
check("empty rows invalid", empty.valid, false);
check("empty rows has a form error", typeof empty.errors.form, "string");

console.log("Allocation — margin per unit");

check("margin -1 invalid", validateAllocationRows(rows(["u1", "100", "-1"])).valid, false);
check('margin "80.12345" invalid', validateAllocationRows(rows(["u1", "100", "80.12345"])).valid, false);
check(
  "missing margin invalid",
  validateAllocationRows([{ userId: "u1", sharePercent: "100", marginPerUnit: undefined }]).valid,
  false
);
check('margin "0" valid', validateAllocationRows(rows(["u1", "100", "0"])).valid, true);
check('margin "80.1234" valid', validateAllocationRows(rows(["u1", "100", "80.1234"])).valid, true);
check(
  "different margins per person (80 / 75) valid",
  validateAllocationRows(rows(["u1", "50", "80"], ["u2", "50", "75"])).valid,
  true
);

console.log("Sale input");

const baseline: SaleInput = {
  product: "AGO",
  unit: "LITRES",
  invoiceNumber: "INV-001",
  customerName: "Acme",
  paymentDate: "2026-10-10",
  totalQuantity: "5000",
};

function saleValid(overrides: Partial<SaleInput>): boolean {
  return validateSaleInput({ ...baseline, ...overrides }, TODAY).valid;
}

check("baseline valid", saleValid({}), true);

check("paymentDate today (2026-10-15) valid", saleValid({ paymentDate: "2026-10-15" }), true);
check("paymentDate 2026-10-16 (future) invalid", saleValid({ paymentDate: "2026-10-16" }), false);
check("paymentDate 2026-10-01 (ledger start) valid", saleValid({ paymentDate: "2026-10-01" }), true);
check("paymentDate 2026-09-30 (before ledger) invalid", saleValid({ paymentDate: "2026-09-30" }), false);
check("paymentDate 2026-02-30 invalid", saleValid({ paymentDate: "2026-02-30" }), false);

check("blank invoiceNumber invalid", saleValid({ invoiceNumber: "" }), false);
check("whitespace invoiceNumber invalid", saleValid({ invoiceNumber: "   " }), false);
check("blank customerName invalid", saleValid({ customerName: "" }), false);

check('totalQuantity "0" invalid', saleValid({ totalQuantity: "0" }), false);
check('totalQuantity "-5" invalid', saleValid({ totalQuantity: "-5" }), false);
check('totalQuantity "10.0001" invalid', saleValid({ totalQuantity: "10.0001" }), false);
check('totalQuantity "abc" invalid', saleValid({ totalQuantity: "abc" }), false);
check('totalQuantity " 500.5 " valid', saleValid({ totalQuantity: " 500.5 " }), true);

check('product "PMS" invalid', saleValid({ product: "PMS" }), false);
check('product "CNG" (dormant) invalid', saleValid({ product: "CNG" }), false);
check('unit "KG" with AGO invalid', saleValid({ unit: "KG" }), false);

console.log("Target instruction");

check(
  "named instruction on 2026-09-30 valid",
  validateTargetInstruction(
    { setByInstructionOf: "Eke Nwannediya Stephanie", instructionDate: "2026-09-30" },
    TODAY
  ).valid,
  true
);
check(
  "instruction date today valid",
  validateTargetInstruction(
    { setByInstructionOf: "Eke Nwannediya Stephanie", instructionDate: "2026-10-15" },
    TODAY
  ).valid,
  true
);
check(
  "blank name invalid",
  validateTargetInstruction({ setByInstructionOf: "  ", instructionDate: "2026-10-01" }, TODAY).valid,
  false
);
check(
  "121-character name invalid",
  validateTargetInstruction(
    { setByInstructionOf: "x".repeat(121), instructionDate: "2026-10-01" },
    TODAY
  ).valid,
  false
);
check(
  "instruction date 2026-10-16 (future) invalid",
  validateTargetInstruction({ setByInstructionOf: "Stephanie", instructionDate: "2026-10-16" }, TODAY).valid,
  false
);
check(
  "instruction date 2026-02-30 invalid",
  validateTargetInstruction({ setByInstructionOf: "Stephanie", instructionDate: "2026-02-30" }, TODAY).valid,
  false
);

console.log(`\n${passed} ledger-validation checks passed.`);
