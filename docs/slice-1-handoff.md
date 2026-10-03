# Slice 1 handoff — after Phase 2 (domain logic and tests)

Branch `slice-1-sales-ledger`. Spec: `docs/slice-1/PHASE-2-SPEC.md`. Decisions appended to `docs/slice-1-decisions.md` as `[Phase 2]`. Phase 1 schema/migration details: see `PHASE-1-SPEC.md` and the Phase 1 commit (`a0d7108`).

## What exists now
- Phase 1 schema is on the **dev** DB only (Neon `ep-lucky-bar-ayspidqx…` / `neondb`). Phase 2 made no DB changes: no migrations, seeds or Prisma queries.
- New pure module `src/lib/ledger/` (no `@/lib/prisma` import). Decimals via `@/lib/outcomes/decimal`; rounding via `Prisma.Decimal.ROUND_DOWN` / `ROUND_HALF_UP` from `@/generated/prisma/browser`.

### `src/lib/ledger/period.ts`
- `OUTCOMES_LEDGER_START = { year: 2026, month: 10 }`, `OUTCOMES_LEDGER_START_DATE = "2026-10-01"`.
- `getPaymentPeriod(paymentDate: string): OutcomePeriod`: parsed from the "YYYY-MM-DD" string; throws `TypeError` if not a real date.
- `isLedgerMonth(period): boolean`: true from 2026/10.
- `getLagosPeriod(now?: Date): OutcomePeriod`: Africa/Lagos month of an instant.

### `src/lib/ledger/targets.ts`
- `computeTargetGeneratedValue(quantity, marginPerUnit): OutcomeDecimal`: quantity × margin, half-up to 2 dp.

### `src/lib/ledger/allocation.ts`
- `splitAllocation(totalQuantity, shares: { userId, sharePercent }[]): { userId, sharePercent, quantity }[]`: each share truncated to 3 dp, and the remainder goes to the largest share (ties go to the lowest `userId`). Σ always equals the total. Output keeps input order. Throws `TypeError` on an invalid total or invalid shares.
- `computeAllocationValue(quantity, marginPerUnit): OutcomeDecimal`: half-up to 2 dp.

### `src/lib/ledger/achievement.ts`
- `computeAchievement({ userId, product, period, allocations, legacy }): { source: "LEDGER" | "LEGACY", quantity, value, allocationCount }`.
  - Ledger month: sums stored `quantity`/`generatedValue` of matching allocations on `ALLOCATED` sales. No rows → `0` / `0`. `legacy` is ignored.
  - Legacy month: returns the legacy row (`null` / `null` when there is none). `allocations` are ignored.

### `src/lib/ledger/validation.ts`
- `validateSaleQuantity(v): string | null`: required, > 0, ≤ 3 dp.
- `validateMarginPerUnit(v): string | null`: required, ≥ 0, ≤ 4 dp.
- `validateAllocationShares(rows)` / `validateAllocationRows(rows)` → `{ valid, shareTotal, errors: { form?, rows: Record<index, {userId?, sharePercent?, marginPerUnit?}> } }`. At least one row; userId required and unique (the 2nd+ occurrence is flagged); share > 0, ≤ 100, ≤ 2 dp; Σ must `eq(100)`.
- `validateSaleInput(input, today?)` → `{ valid, errors }`. Product must be valid **and** active; unit must be allowed for the product; invoice/customer non-blank; paymentDate a real date, ≥ 2026-10-01, ≤ today; quantity as above; notes are optional text.
- `validateTargetInstruction({ setByInstructionOf, instructionDate }, today?)` → `{ valid, errors }`. Name non-blank, ≤ 120 chars; date real, ≤ today.
- `today` defaults to `getLagosReportDate()`. Strings are trimmed before parsing.

## Existing code changed
- `scripts/test-outcomes-calculations.ts`: expected 12,345.678 × 80.75 corrected to `996913.4985` (the code was right).
- `src/lib/outcomes/validation.ts` `isValidNonNegativeDecimal`: trims string input before `new Prisma.Decimal(...)`. No other change.

## Tests (`npx tsx scripts/<name>.ts`, no DB needed)
| Script | Result |
|---|---|
| `test-ledger-period.ts` | 14 passed |
| `test-ledger-allocation.ts` | 26 passed |
| `test-ledger-validation.ts` | 52 passed |
| `test-ledger-achievement.ts` | 10 passed |
| `test-outcomes-calculations.ts` | 53 passed (was failing) |
| `test-outcomes-validation.ts` | 81 passed (was failing) |
| `test-profitability-calculations.ts` | 32 passed |
- `npx tsc --noEmit` passes. `npm run lint`: 14 errors and 14 warnings in total, unchanged and none new. The only problem in a touched file is the existing unused `checkApprox` warning in `test-outcomes-calculations.ts`.
- `test-slice1-schema.ts` was not run this phase (no DB work). Phase 1 result: 34 passed.

## Known gaps / notes for Phase 3
- `getAchievement(userId, product, period)`: a DB loader that fetches allocations (with sale status/period) plus the legacy `OutcomeAchievement` row, then calls `computeAchievement`. Test with `LEDGER_TEST_DB=dev`.
- `writeAuditEntry(tx, …)` in `src/lib/ledger/audit.ts`.
- Use `getLagosPeriod()` for default months. Recompute `periodYear/Month` via `getPaymentPeriod` whenever `paymentDate` changes. Allocation saves must bump the sale's `updatedAt`.
- Save-allocations action: an empty row set → sale back to `PENDING_ALLOCATION` without calling `splitAllocation`. Store `generatedValue` from `computeAllocationValue`.
- Target save action: call `validateTargetInstruction` and store `computeTargetGeneratedValue`.
- `getCurrentOutcomePeriod()` and `/outcomes` still use server-local time. Rewire to Lagos time in Phase 3/4.
- `test-outcomes-domain.ts` / `test-outcomes-persistence.ts` are still commented out. Revisit in Phase 3.
- `splitAllocation` relies on Decimal's 20-significant-digit precision. That is exact for any realistic volume (up to ~10¹² L).
- Carried over: decide DRIVER page access before password sign-in; `getCurrentUser()` returns `passwordHash` (keep it off the client); `seed-initial-users.ts` would rename the IT user if rerun; Neon dev connections sometimes drop (retry).

## Rollback of Phase 1 schema (do not run unless needed)
1. `DROP TRIGGER "AuditEntry_no_update_delete" ON "AuditEntry"`; `DROP TRIGGER "AuditEntry_no_truncate" ON "AuditEntry"`; `DROP FUNCTION "audit_entry_append_only"()`.
2. `DROP TABLE "AuditEntry"`, `"SaleAllocation"`, `"SaleRecord"`; drop enums `AuditEntityType`, `AuditAction`, `SaleStatus`, `SaleSource`.
3. Drop `Driver.userId`; drop `OutcomeTarget.setByInstructionOf`, `instructionDate`; drop `User.username`, `passwordHash`, `failedLoginCount`, `lockedUntil`.
4. Delete DRIVER users created by the seed (after step 3 unlinks them). Set MANAGEMENT users to IT.
5. Recreate `UserRole` without MANAGEMENT/DRIVER (Postgres can't drop enum values), then `RENAME VALUE 'IT' TO 'ADMIN'`.
6. Restore `entraId NOT NULL` only if no user has a null `entraId`.
7. Revert the code commit; delete the migration folder and its `_prisma_migrations` row.
Phase 2 rollback: revert its commit (code only).
