# PHASE-2-SPEC — Domain logic and tests

Branch `slice-1-sales-ledger`. Run with `docs/slice-1/build-from-spec-prompt.md`. Precedence still applies; this spec's Decisions section (§9) is appended to `docs/slice-1-decisions.md` before building.

This phase is **pure code: no database access, no Prisma client queries, no migrations, no seeds.** Nothing in `src/lib/ledger/` may import `@/lib/prisma`.

---

## 1. Scope (build exactly this)

1. New files under `src/lib/ledger/`: `period.ts`, `targets.ts`, `allocation.ts`, `achievement.ts`, `validation.ts` (§3).
2. Fix the two failing existing tests (§4).
3. New test scripts: `scripts/test-ledger-period.ts`, `test-ledger-allocation.ts`, `test-ledger-validation.ts`, `test-ledger-achievement.ts` (§5).
4. Update `docs/slice-1-handoff.md` to "after Phase 2".
5. Commit on the slice branch.

## 2. Out of scope (do not build)

- `getAchievement` (DB loader), `writeAuditEntry` / `audit.ts`, `service.ts`, server actions, reads (Phase 3).
- Any UI, routes, nav (Phase 4).
- Rewiring `getCurrentOutcomePeriod()` or the existing `/outcomes` page to Lagos time (Phase 3/4). Only add the new `getLagosPeriod()`.
- Changes to `src/lib/outcomes/calculations.ts` or any other existing outcomes code, except the one-line trim fix in §4.
- Reviving the commented-out `test-outcomes-domain.ts` / `test-outcomes-persistence.ts`.
- Reversals / negative quantities, sale money fields, Zoho, password login, month approval/lock.
- New npm dependencies.

---

## 3. Functions (exact)

Conventions: Decimal via `toOutcomeDecimal` / `OutcomeDecimal` / `DecimalInput` from `@/lib/outcomes/decimal`. Rounding modes from `Prisma.Decimal` (`ROUND_DOWN`, `ROUND_HALF_UP`) imported from `@/generated/prisma/browser`. String inputs are trimmed before parsing. Validators return `{ valid, errors }` like `src/lib/outcomes/validation.ts`, with plain-English messages.

### 3.1 `src/lib/ledger/period.ts`

```ts
export const OUTCOMES_LEDGER_START: OutcomePeriod = { year: 2026, month: 10 };
export const OUTCOMES_LEDGER_START_DATE = "2026-10-01";

/** "YYYY-MM-DD" (a Lagos calendar date) -> { year, month }. Throws TypeError if !isValidReportDate. */
export function getPaymentPeriod(paymentDate: string): OutcomePeriod;

/** true when (year, month) >= OUTCOMES_LEDGER_START. */
export function isLedgerMonth(period: OutcomePeriod): boolean;

/** Lagos month of an instant: getPaymentPeriod(getLagosReportDate(now)). */
export function getLagosPeriod(now?: Date): OutcomePeriod;
```
Reuse `isValidReportDate` and `getLagosReportDate` from `src/lib/operations/report-date.ts` and `OutcomePeriod` from `src/lib/outcomes/period.ts`. Parse year/month from the string; never use local `Date` getters.

### 3.2 `src/lib/ledger/targets.ts`

```ts
/** quantity × margin, rounded ROUND_HALF_UP to 2 dp. Wraps deriveOutcomeValue. No validation here. */
export function computeTargetGeneratedValue(quantity: DecimalInput, marginPerUnit: DecimalInput): OutcomeDecimal;
```

### 3.3 `src/lib/ledger/allocation.ts`

```ts
export interface AllocationShareInput { userId: string; sharePercent: DecimalInput; }
export interface SplitAllocationRow { userId: string; sharePercent: OutcomeDecimal; quantity: OutcomeDecimal; }

/** Throws TypeError if validateSaleQuantity(total) or validateAllocationShares(shares) is invalid. Output order = input order. */
export function splitAllocation(totalQuantity: DecimalInput, shares: AllocationShareInput[]): SplitAllocationRow[];

/** quantity × margin, rounded ROUND_HALF_UP to 2 dp. No validation here. */
export function computeAllocationValue(quantity: DecimalInput, marginPerUnit: DecimalInput): OutcomeDecimal;
```

**Split rule (exact):**
1. For each row: `raw = total × share / 100`, then `toDecimalPlaces(3, ROUND_DOWN)`.
2. `remainder = total − Σ truncated` (always ≥ 0 and < n × 0.001).
3. Add the whole remainder to the row with the largest share. Ties go to the lowest `userId` (plain string compare `<`), so the result does not depend on input order.
4. Σ quantities equals `total` exactly (`Decimal.eq`).

An empty share set is never passed to `splitAllocation`. Phase 3's save action handles "no rows" (the sale goes back to `PENDING_ALLOCATION`) before calling it.

### 3.4 `src/lib/ledger/achievement.ts`

```ts
export interface AchievementAllocationInput {
  userId: string;
  product: OutcomeProduct;
  periodYear: number;
  periodMonth: number;
  saleStatus: SaleStatus;
  quantity: DecimalInput;        // stored SaleAllocation.quantity
  generatedValue: DecimalInput;  // stored SaleAllocation.generatedValue
}
export interface LegacyAchievementInput {
  achievedQuantity: DecimalInput;
  achievedGeneratedValue: DecimalInput | null;
}
export interface AchievementResult {
  source: "LEDGER" | "LEGACY";
  quantity: OutcomeDecimal | null;
  value: OutcomeDecimal | null;
  allocationCount: number;
}

export function computeAchievement(input: {
  userId: string;
  product: OutcomeProduct;
  period: OutcomePeriod;
  allocations: AchievementAllocationInput[];
  legacy: LegacyAchievementInput | null;
}): AchievementResult;
```

**Rules:**
- **Ledger month** (`isLedgerMonth`): sum the stored `quantity` and `generatedValue` of allocations matching userId, product, periodYear/periodMonth **and** `saleStatus === "ALLOCATED"`. `legacy` is ignored. No matches gives quantity `0` and value `0` (not null). `source: "LEDGER"`.
- **Legacy month**: `allocations` are ignored. If `legacy` is null, quantity and value are null. Otherwise quantity = `achievedQuantity`, and value = `achievedGeneratedValue` (null stays null). `allocationCount: 0`, `source: "LEGACY"`.
- Values are summed as stored. They are never recomputed from quantity × margin, so the month total always equals the visible rows.

### 3.5 `src/lib/ledger/validation.ts`

```ts
export function validateSaleQuantity(value: unknown): string | null;   // null = ok, else message
export function validateMarginPerUnit(value: unknown): string | null;

export interface AllocationRowInput { userId: unknown; sharePercent: unknown; marginPerUnit: unknown; }
export interface AllocationValidationResult {
  valid: boolean;
  shareTotal: string | null;   // Σ of parseable shares, toFixed(2); null if none parse
  errors: {
    form?: string;
    rows: Record<number, Partial<Record<"userId" | "sharePercent" | "marginPerUnit", string>>>;
  };
}
export function validateAllocationShares(rows: { userId: unknown; sharePercent: unknown }[]): AllocationValidationResult;
export function validateAllocationRows(rows: AllocationRowInput[]): AllocationValidationResult; // shares + margins

export interface SaleInput {
  product: unknown; invoiceNumber: unknown; customerName: unknown;
  paymentDate: unknown; totalQuantity: unknown; unit: unknown; notes?: unknown;
}
export function validateSaleInput(input: SaleInput, today?: string /* default getLagosReportDate() */):
  { valid: boolean; errors: Partial<Record<keyof SaleInput, string>> };

export interface TargetInstructionInput { setByInstructionOf: unknown; instructionDate: unknown; }
export function validateTargetInstruction(input: TargetInstructionInput, today?: string):
  { valid: boolean; errors: Partial<Record<keyof TargetInstructionInput, string>> };
```

**Rejection rules:**

| Field | Rule |
|---|---|
| rows | At least 1, else `form` error. |
| userId | Non-empty string after trim. A duplicate userId flags the 2nd and later occurrences with "This person already has a share in this sale." |
| sharePercent | Parses as Decimal; > 0; ≤ 100; at most 2 dp (33.333 is rejected, not rounded). |
| Share total | Σ shares must `eq(100)` exactly, else `form` error "Shares must total exactly 100.00% (currently X%)." 99.99 and 100.01 are both rejected. "100" and "100.00" are both accepted. |
| marginPerUnit | Required; parses; ≥ 0; at most 4 dp. 0 is allowed. |
| totalQuantity | Required; parses; > 0; at most 3 dp. |
| product | `isValidOutcomeProduct` **and** `isOutcomeProductActive`. |
| unit | `isUnitAllowedForProduct(product, unit)`. |
| invoiceNumber, customerName | Non-empty after trim. |
| paymentDate | `isValidReportDate`; ≥ `OUTCOMES_LEDGER_START_DATE`; ≤ `today`. |
| notes | Optional; must be a string if present. |
| setByInstructionOf | Free text, non-empty after trim, ≤ 120 chars. |
| instructionDate | `isValidReportDate`; ≤ `today`. |

---

## 4. Fix existing tests

1. `scripts/test-outcomes-calculations.ts` (lines ~75 and ~81): the expected value of `12345.678 × 80.75` becomes `"996913.4985"` / `996913.4985`. The code is correct and the test expectation was wrong.
2. `src/lib/outcomes/validation.ts`, `isValidNonNegativeDecimal`: trim string input before `new Prisma.Decimal(...)` (currently `" 60000 "` passes `isValidOutcomeDecimal` but throws here). Change only this.
3. Run both scripts to the end. If a further assertion fails past the current stopping point, **stop and report**; do not fix it inside this phase.

---

## 5. Tests (existing style: `check(label, actual, expected)`, `ok — label`, exit 1 on failure, run with `npx tsx scripts/<name>.ts`)

Compare Decimals with `.toFixed(n)` strings.

### `test-ledger-period.ts`
1. `getPaymentPeriod("2026-10-31")` → 2026/10. `"2026-11-01"` → 2026/11.
2. `"2026-12-31"` → 2026/12. `"2027-01-01"` → 2027/1.
3. `getLagosPeriod(new Date("2026-10-31T23:30:00Z"))` → 2026/11. `getLagosPeriod(new Date("2026-10-31T22:59:59Z"))` → 2026/10.
4. `getPaymentPeriod` throws for `"2026-02-30"`, `"2026-13-01"`, `"2026/10/01"`, `""`.
5. `isLedgerMonth`: 2026/9 false, 2026/10 true, 2027/1 true, 2025/12 false.

### `test-ledger-allocation.ts`
1. `computeTargetGeneratedValue("80000", "80")` → `"6400000.00"`.
2. `computeTargetGeneratedValue("12345.678", "80.75")` → `"996913.50"`.
3. `computeAllocationValue("1.000", "0.0050")` → `"0.01"` (half-up). `("1.000", "0.0049")` → `"0.00"`.
4. `computeAllocationValue("3333.333", "80.005")` → `"266683.31"`.
5. 10,000 L at u1 33.33 / u2 33.33 / u3 33.34 → 3333.000 / 3333.000 / 3334.000.
6. 100.001 L at 33.33/33.33/33.34 → 33.330 / 33.330 / 33.341.
7. 1 L at 33.33/33.33/33.34 → 0.333 / 0.333 / 0.334.
8. 1,000.001 L, `u-a` 50 / `u-b` 50 → `u-a` 500.001, `u-b` 500.000. With input reversed, the per-user result is the same and the output is in input order.
9. 60/40 on 10,000 L → 6000.000 / 4000.000.
10. Single row 100 on 1234.567 → 1234.567.
11. 0.001 L at 50/50 (`u-a`, `u-b`) → 0.001 / 0.000.
12. For cases 5–11: Σ quantities `eq` total.
13. `splitAllocation` throws for: shares totalling 99.99; total `"0"`; total `"-5"`; total `"10.0001"`; duplicate userId.

### `test-ledger-validation.ts`
Allocation (`validateAllocationRows`, margin "80" unless stated):
1. 100.00 single row valid. `"100"` valid. 50/50 valid.
2. 33.33/33.33/33.33 (99.99) invalid; `shareTotal` `"99.99"`; form error mentions 99.99.
3. 33.33/33.33/33.35 (100.01) invalid.
4. Share `0` invalid (row error). Shares -10/60/50 invalid (row 0 error).
5. Single share 100.01 invalid (> 100).
6. Share `"33.333"` with others making 100 invalid (row error).
7. Share `"abc"` and `""` invalid. `" 50 "` + `"50"` valid.
8. Duplicate userId (u1 50 / u1 50) invalid; row 1 flagged, row 0 not.
9. Empty userId invalid. Empty rows array invalid (form error).
10. Margin `-1` invalid; `"80.12345"` invalid; missing invalid; `"0"` valid; `"80.1234"` valid.
11. Different margins per person (80 / 75) valid.

Sale (`validateSaleInput`, `today = "2026-10-15"`, baseline AGO / LITRES / "INV-001" / "Acme" / "2026-10-10" / "5000"):
12. Baseline valid.
13. paymentDate `"2026-10-15"` valid; `"2026-10-16"` invalid (future).
14. `"2026-10-01"` valid; `"2026-09-30"` invalid (before ledger start).
15. `"2026-02-30"` invalid.
16. Blank / whitespace invoiceNumber invalid; blank customerName invalid.
17. totalQuantity `"0"`, `"-5"`, `"10.0001"`, `"abc"` invalid; `" 500.5 "` valid.
18. product `"PMS"` invalid; `"CNG"` invalid (dormant); unit `"KG"` with AGO invalid.

Target instruction (`today = "2026-10-15"`):
19. `{ "Eke Nwannediya Stephanie", "2026-09-30" }` valid; date `"2026-10-15"` valid.
20. Blank name invalid; 121-char name invalid; date `"2026-10-16"` invalid; `"2026-02-30"` invalid.

### `test-ledger-achievement.ts`
Fixtures for user `u1`, AGO, built with `getPaymentPeriod` from the payment dates:
- A: ALLOCATED, `2026-10-31`, 3000.000 L, 240000.00
- B: ALLOCATED, `2026-10-01`, 1000.500 L, 80040.00
- C: PENDING_ALLOCATION, `2026-10-15`, 5000 L, 400000.00
- D: ALLOCATED, `2026-11-01`, 700 L, 56000.00
- E: ALLOCATED, `2026-10-10`, **CNG**, 900 / 72000.00
- F: user `u2`, ALLOCATED, `2026-10-10`, AGO, 800 / 64000.00

1. u1 AGO 2026/10 → quantity 4000.500, value 320040.00, count 2, LEDGER. (Pending C, November D, CNG E and other-user F are excluded; month-boundary dates 10-01 and 10-31 are included.)
2. u1 AGO 2026/11 → 700.000 / 56000.00, count 1.
3. u1 AGO 2026/12 (no rows) → quantity `"0"`, value `"0"` (not null), count 0, LEDGER.
4. Only C supplied, 2026/10 → 0 / 0, count 0.
5. 2026/9 with legacy `{ 50000, 4000000.00 }` and an ALLOCATED Sept allocation → 50000 / 4000000.00, LEGACY, count 0 (allocations ignored).
6. 2026/9, legacy null → quantity null, value null, LEGACY.
7. 2026/9, legacy `{ 50000, null }` → quantity 50000, value null.
8. 2026/10 with a legacy row supplied → legacy ignored, same result as case 1.

### Also run and report
- `npx tsx scripts/test-outcomes-calculations.ts` and `test-outcomes-validation.ts`: all pass.
- `npx tsx scripts/test-profitability-calculations.ts`: still 32 passed.
- `npx tsc --noEmit`: passes. `npm run lint`: no new errors or warnings in touched/new files.
- Do **not** run `test-slice1-schema.ts`, `prisma migrate` or any seed (no DB work this phase).

---

## 6. Handoff update
Rewrite `docs/slice-1-handoff.md` as "after Phase 2": the new files and their exports, the test counts per script, the existing-test fixes, and the Phase 3 notes in §8. Keep the Phase 1 rollback section.

## 7. Commit
One commit, for example `Phase 2: ledger domain logic and tests`, ending with the standard co-author line. No `.env`.

## 8. Notes for Phase 3 (do not build now)
- `getAchievement(userId, product, period)`: a DB loader that fetches the allocations + legacy row and calls `computeAchievement`. Test with `LEDGER_TEST_DB=dev`.
- `writeAuditEntry(tx, …)` in `src/lib/ledger/audit.ts`.
- Use `getLagosPeriod()` for default months. Recompute `periodYear/Month` via `getPaymentPeriod` whenever `paymentDate` changes.
- The save-allocations action: an empty row set → `PENDING_ALLOCATION` without calling `splitAllocation`. Values are stored from `computeAllocationValue`.
- The target save action: call `validateTargetInstruction` and store `computeTargetGeneratedValue`.

---

## 9. Decisions (append to `docs/slice-1-decisions.md`, tagged [Phase 2])

1. Phase 2 is pure code with no DB access. `getAchievement` (DB loader) and `writeAuditEntry`/`audit.ts` move to Phase 3. Phase 2 provides the pure `computeAchievement`. (supersedes: master prompt Phase 2 `getAchievement`; plan §4 `audit.ts` in Phase 2)
2. Achievement for a ledger month with no allocated sales is `0`, not `null`. Legacy months (before October 2026) return `null` when no `OutcomeAchievement` row exists. (supersedes: plan §7 "no rows → null")
3. `test-outcomes-calculations.ts` had a wrong expected value (12,345.678 × 80.75 = 996,913.4985); the test is corrected, not the code. `isValidNonNegativeDecimal` is fixed to trim string input.
4. Shares with more than 2 decimal places are rejected, not rounded.
5. `instructionDate` after Lagos today is rejected. `setByInstructionOf` is free text (the instructing person's name, ≤ 120 chars), not a user id.
6. Litre split: truncate each share to 3 dp, and give the whole remainder to the largest share, with ties going to the lowest `userId`. Generated values (targets and allocations) are rounded half-up to 2 dp. Achievement sums stored allocation values.
7. Sale validation also rejects payment dates before 2026-10-01 (pre-ledger months use legacy rows, so such a sale would never count), sales for dormant products (CNG/LPG today), margins with more than 4 dp and quantities with more than 3 dp. *(Reviewer default; strike if not wanted.)*
8. The commented-out `test-outcomes-domain.ts` / `test-outcomes-persistence.ts` stay commented in Phase 2; revisit in Phase 3. (supersedes: PHASE-1-SPEC §2 "reviving the commented-out tests (Phase 2)")
