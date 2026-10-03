# Slice 1 plan — Sales ledger, allocation, audit trail, targets rework

Phase 0 output. Read-only exploration; this file is the only change.
Precedence: `docs/slice-1-decisions.md` (currently empty) > phase prompt > master prompt > standard.

---

## 0. What exists today (findings)

| Area | Where | Notes |
|---|---|---|
| Schema | `prisma/schema.prisma` | `User` (`entraId String @unique`, required), `UserRole` = ADMIN, BUSINESS_DEVELOPMENT, SALES, OPERATIONS, FINANCE. `Driver` (name, phone, active) has no link to `User`. |
| Targets | `OutcomeTarget` | Per user/product/year/month, unique. `targetQuantity` (mapped to column `targetValue`, Decimal 20,3), `unit`, `targetMarginPerUnit` (Decimal 18,4, nullable), `targetGeneratedValue` (Decimal 30,2, nullable), created/updated by. |
| Achievements | `OutcomeAchievement` | Same shape. **Self-entered by staff** via `saveOutcomeAchievementAction` + `OutcomeAchievementEntry.tsx`. |
| Domain code | `src/lib/outcomes/` | `calculations.ts` (`deriveOutcomeValue` uses Prisma Decimal), `decimal.ts`, `validation.ts`, `period.ts`, `eligibility.ts` (MD excluded **by hard-coded name**). |
| Actions | `src/lib/outcomes/actions.ts` | Server actions (`"use server"`, `useActionState` shape `{success, error, fieldErrors}`). Target save = bulk upsert of all staff rows in one transaction, ADMIN only, **no audit entry, no delete**. |
| Page | `src/app/outcomes/page.tsx` + `src/components/outcomes/*` | Server component; `isAdmin` shows the Target Console; non-admins get self-entry form. Converts Decimal to `number` for display. Defaults month with server-local time (UTC on Vercel), not Lagos. |
| Auth | `src/lib/auth/session.ts`, `src/app/api/auth/callback/route.ts`, `src/proxy.ts` | Microsoft login only; callback looks up `User` by `entraId`; DB session cookie `ab_session`; `getCurrentUser()` returns the `User` or null. |
| Permissions | `src/lib/commercial/permissions.ts` | Pattern: `canX(role: UserRole): boolean`. Outcomes checks inline `role !== "ADMIN"`. |
| Audit patterns | `CommercialAuditLog`, `DeliveryAuditLog` | `actorName`, `actorRole` (snapshot strings), `action`, `details` text. Written via `tx.xAuditLog.create` inside `prisma.$transaction` (some writes are outside a transaction). No before/after values, no actor FK. |
| Lagos dates | `src/lib/operations/report-date.ts` | `getLagosReportDate()` via `Intl` with `Africa/Lagos`; dates kept as `"YYYY-MM-DD"` strings to avoid UTC drift. Reusable. |
| Design tokens | `src/app/globals.css` | `--green`, `--green-dark`, `--amber`, `--amber-bg`, `--grey-*`, `--radius*`, `--shadow*` already exist. |
| Tests | `scripts/test-*.ts` | No npm test script, no runner. Run each with `npx tsx scripts/test-<name>.ts`; `node:assert/strict` + a local `check(label, actual, expected)` that prints `ok — label`; exit code 1 on failure. `@/` alias resolves under tsx. |

**Current test status (run during Phase 0):**
- `test-profitability-calculations.ts` — passes.
- `test-outcomes-calculations.ts` — **fails**: expects `12345.678 × 80.75 = 997530.5229`; the correct product is `996913.4985`. The test is wrong, not the code.
- `test-outcomes-validation.ts` — **fails**: "whitespace around valid quantity/margin is accepted".
- `test-outcomes-domain.ts`, `test-outcomes-persistence.ts` — entirely commented out (stale: old `targetValue` field, old role-based eligibility).

**Database:** `.env` `DATABASE_URL` points to a Neon Postgres host (`ep-lucky-bar-ayspidqx…us-east-2.aws.neon.tech`, database `neondb`). **Yaroh confirmed (2026-10-03) this is the development database.**

**Dev data (read-only check, 2026-10-03):** one `Driver` ("Celestine", 2 deliveries); 6 users, all with `entraId` (Eke Nwannediya Stephanie ADMIN, Emakuneyi Oghenenyerhovwo ADMIN, Ezeilo Sharon OPERATIONS, Femi-Ademola Oluwatobi BUSINESS_DEVELOPMENT, Joseph Regina FINANCE, Victor Nnamdi Paul SALES); 5 `OutcomeTarget` rows for Sept 2026, none with a margin; 0 `OutcomeAchievement` rows.

---

## 1. Schema changes (Phase 1)

All additive or loosening; no column is dropped or renamed. Migration name: `<timestamp>_slice1_sales_ledger` (matches recent `add_…`/`phase1_…` naming).

### 1.1 `User`
```prisma
entraId String? @unique   // was String @unique. Postgres allows many NULLs under a unique index.
// new relations
driver            Driver?          // back-relation of Driver.userId
saleRecordsCreated / saleRecordsUpdated
saleAllocations / saleAllocationsCreated / saleAllocationsUpdated
auditEntries      AuditEntry[]     // as actor
```
- `UserRole`: rename `ADMIN` → `IT` in the migration (`ALTER TYPE "UserRole" RENAME VALUE`, so existing ADMIN rows become IT with no data copy), and add `MANAGEMENT` and `DRIVER` (decided).
- Non-Microsoft staff are ordinary `User` rows with `entraId = null`. The Microsoft callback can never match them.
- Driver sign-in (decided): new fields `User.username String? @unique` and `User.passwordHash String?` (Node `crypto.scrypt`, per-user random salt, stored as `scrypt$<salt>$<hash>`, constant-time compare). New `POST /api/auth/password-login` creates the same `ab_session` session via `createSessionAndSetCookie`; the `/login` page gets a small "Sign in without Microsoft" form. Any failure shows the same generic message, and repeated failed attempts per username are limited. Only users with `entraId = null` can sign in this way. IT sets and resets passwords with the one-off script; there is no self-service reset in slice 1. The `src/proxy.ts` matcher already excludes `/api/auth/*`.
- Code that must change to compile: `canSeeAllNotifications(user: { entraId: string })` → `string | null`. Nothing else reads `entraId` as non-null.

### 1.2 `Driver` ↔ `User`
```prisma
model Driver {
  ...
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```
Optional 1:1. Targets and allocations always reference `User`, never `Driver`. Deliveries keep using `Driver` unchanged. Supports more than one driver (nothing hard-coded).

### 1.3 `OutcomeTarget` additions
```prisma
setByInstructionOf String?            // free text, e.g. the boss's name
instructionDate    DateTime? @db.Date // Lagos calendar date
```
Nullable because legacy rows have neither. New/edited targets made through the slice-1 flow **require** both (enforced in validation, not the DB). `targetGeneratedValue` stays server-derived.

### 1.4 New enums
```prisma
enum SaleSource      { MANUAL ZOHO }
enum SaleStatus      { PENDING_ALLOCATION ALLOCATED }   // REVERSED added later, with reversesSaleId
enum AuditAction     { CREATE UPDATE DELETE }
enum AuditEntityType { OUTCOME_TARGET SALE_RECORD SALE_ALLOCATION }
```

### 1.5 `SaleRecord`
| Field | Type | Notes |
|---|---|---|
| id | String @id cuid | |
| product | OutcomeProduct | Only active products (AGO) accepted by validation. |
| source | SaleSource @default(MANUAL) | |
| zohoPaymentId | String? @unique | Null for manual; unique when present (slice 2 idempotency). |
| invoiceNumber | String | **Not unique** (one invoice can have several partial payments). |
| customerName | String | |
| zohoCustomerId | String? | |
| paymentDate | DateTime @db.Date | Lagos calendar date the money arrived. |
| periodYear, periodMonth | Int | Server-derived from `paymentDate`; indexed for month queries. Never client-supplied. |
| totalQuantity | Decimal(20,3) | > 0. |
| unit | OutcomeUnit | LITRES for AGO. |
| status | SaleStatus @default(PENDING_ALLOCATION) | Server-maintained. |
| reversesSaleId | String? (self-relation, onDelete Restrict) | Unused in v1; reversal hook. |
| notes | String? | |
| createdById / updatedById | FK User (Restrict / SetNull) | Matches OutcomeTarget. |
| createdAt / updatedAt | | `updatedAt` also used as the optimistic-concurrency token for edits. |

Indexes: `(product, periodYear, periodMonth, status)`, `(status)`, `(invoiceNumber)`, `(createdById)`.

### 1.6 `SaleAllocation`
| Field | Type | Notes |
|---|---|---|
| id | String @id cuid | |
| saleRecordId | FK SaleRecord, onDelete Restrict | Deleting a sale deletes its allocations explicitly in code so each gets an audit entry. |
| userId | FK User, onDelete Restrict | |
| sharePercent | Decimal(5,2) | > 0, ≤ 100, max 2 dp. |
| quantity | Decimal(20,3) | Server-derived (§3). |
| marginPerUnit | Decimal(18,4) | ≥ 0, entered at allocation time. |
| generatedValue | Decimal(30,2) | Server-derived = quantity × margin, rounded half-up to 2 dp. |
| createdById / updatedById, createdAt / updatedAt | | |

`@@unique([saleRecordId, userId])`, `@@index([userId])`. Month/product filtering joins through `SaleRecord`'s indexed `periodYear/periodMonth`.

### 1.7 `AuditEntry` (append-only)
| Field | Type | Notes |
|---|---|---|
| id | String @id cuid | |
| entityType | AuditEntityType | |
| entityId | String | No FK; the entity may be deleted later. |
| parentEntityId | String? | For allocations: the sale id, so a sale's trail includes deleted allocations. |
| action | AuditAction | |
| before / after | Json? | Full row snapshot; Decimals as strings; null before on CREATE, null after on DELETE. |
| actorUserId | FK User, onDelete Restrict | |
| actorName / actorRole | String | Snapshot (existing convention). |
| reason | String? | |
| createdAt | DateTime @default(now()) | |

Indexes: `(entityType, entityId, createdAt)`, `(parentEntityId)`, `(actorUserId)`, `(createdAt)`.
Append-only enforcement: (a) no update/delete calls anywhere in code; single writer `writeAuditEntry(tx, …)`; (b) **proposed**: raw SQL in the migration adding a trigger that raises on `UPDATE`/`DELETE` of `AuditEntry`. Rollback note will cover dropping it.

### 1.8 Existing rows: legacy months vs ledger months
- Add a config constant `OUTCOMES_LEDGER_START = { year: 2026, month: 10 }` (decided).
- **Before** October 2026: achievement shown = existing `OutcomeAchievement` row (read-only; labelled "legacy"). Rows are kept untouched, never deleted or migrated. (Dev currently has none.)
- **From** October 2026: achievement is computed from `SaleAllocation` only. No `OutcomeAchievement` rows are written for ledger months (one source of truth; computing on read is cheap at this data size).
- The manual achievement form is IT-only and accepts months before October 2026 only. Each save writes an audit entry (`AuditEntityType` gains `OUTCOME_ACHIEVEMENT`). From October, corrections go only through sales and allocations (decided).
- Legacy targets with null margin/generated value (the 5 Sept rows) stay valid; the month view shows quantity only and "value n/a" for them.
- No backfill is required. Rollback: `prisma migrate` down via a hand-written reverse SQL note (drop new tables/enums/columns; restore `NOT NULL` on `entraId` only if no null rows exist).

---

## 2. People, roles and permissions

- **Rule (decided):** every person's role matches their job; features can be shared across roles; ask Yaroh when a feature's audience is unclear.
- **Driver**: `User` "Celestine" with role `DRIVER`, `entraId` null, linked from the existing `Driver` row by a one-off script (`scripts/seed-slice1-staff.ts`, idempotent, dev first). The driver **must be able to use the app**, so a non-Microsoft sign-in is needed (decided: username + password, §1.1).
- **Other non-Microsoft staff**: unknown for now. The same script/sign-in path will add them later; nothing is created for them in slice 1.
- **Role mapping (decided):** Eke Nwannediya Stephanie → `MANAGEMENT`; Emakuneyi Oghenenyerhovwo (Yaroh) → `IT`; Celestine → `DRIVER`; others unchanged. Done by the rename plus the one-off script. Target eligibility = ACTIVE and role ≠ MANAGEMENT (replaces the hard-coded MD name).
- **Former ADMIN features → IT only (decided).** Code that changes from `ADMIN` to `IT`: `src/lib/commercial/permissions.ts` (5 checks), `src/app/commercial/leads/[id]/page.tsx`, `src/app/outcomes/page.tsx`, `src/lib/outcomes/actions.ts`, `src/lib/outcomes/eligibility.ts` (comments + rule), `scripts/seed-initial-users.ts` (Stephanie → MANAGEMENT). As a result, Stephanie loses access to leads, order creation, daily-price emails and the Outcomes console. MANAGEMENT gets only the read access in the table below. `canSeeAllNotifications` stays tied to its single entraId (unchanged).
- New helpers in `src/lib/ledger/permissions.ts`, same style as commercial:

| Capability | IT (Yaroh) | FINANCE | MANAGEMENT | Other staff / DRIVER |
|---|---|---|---|---|
| Create/edit/delete targets, sales, allocations | yes | no (read-only, decided) | no | no |
| Manual achievement form | yes (decided) | no | no | no |
| Read month view (all people), sales list, pending queue | yes | yes | yes | own row only (decided) |
| Read audit trail | yes | yes | yes | no |

Checked in every server action and every page loader, not just the UI.

---

## 3. Rounding and timezone rules

**Splitting litres** (`splitAllocation(totalQuantity, shares)`):
1. Reject unless: ≥1 row; every share > 0 and ≤ 100 with at most 2 dp (33.333 is rejected, not rounded); no duplicate `userId`; shares sum to exactly `100.00` (Decimal compare; 99.99 and 100.01 rejected).
2. For each row: `raw = total × share / 100`, truncated (ROUND_DOWN) to 3 dp (the column scale).
3. `remainder = total − Σ truncated` (always ≥ 0 and < n × 0.001).
4. Add the whole remainder to the row with the **largest share**; ties go to the row that sorts first by `userId` ascending (stable regardless of input order).
5. Result always sums exactly to `total`. Example: 10,000 L at 33.33/33.33/33.34 → 3333.000 / 3333.000 / 3334.000. 1,000.001 L at 50/50 → 500.000 / 500.001 (tie broken by userId).

**Value:** `generatedValue = quantity × marginPerUnit`, rounded half-up to 2 dp (kobo) on the server before storage. Achievement = sum of stored `generatedValue`s, so the month total always equals the visible rows.

**Payment month (Africa/Lagos):**
- `paymentDate` is a **calendar date** (`@db.Date`), not a timestamp, entered as `"YYYY-MM-DD"` and interpreted as a Lagos date. Zoho supplies payment dates as plain dates too, so slice 2 fits.
- `periodYear/periodMonth` = the year/month of that string. Read back with `toISOString().slice(0, 10)`, never local getters.
- Wherever a timestamp has to become a date (default "today", any future Zoho timestamp), use `getLagosReportDate()` (Africa/Lagos, UTC+1, no DST). Boundary test: `2026-10-31T23:30:00Z` → `2026-11-01` → November.
- Payment dates after Lagos "today" are rejected (decided).

**Margins (decided):** each allocation stores its own `marginPerUnit`. The Allocate screen may prefill the same value on every row for convenience, but each person's margin is entered and saved separately. Targets also keep a separate margin per person (decided).

---

## 4. Domain functions (Phase 2) — `src/lib/ledger/`

| File | Functions |
|---|---|
| `allocation.ts` | `splitAllocation(total, shares[])`, `computeAllocationValue(qty, margin)` |
| `targets.ts` | `computeTargetGeneratedValue(qty, margin)` (wraps existing `deriveOutcomeValue`, adds 2 dp rounding) |
| `period.ts` | `getPaymentPeriod(paymentDate: string)`, `isLedgerMonth(year, month)` |
| `achievement.ts` | pure `sumAchievement(allocations)`; DB `getAchievement(userId, product, year, month)` = Σ allocations where sale `status = ALLOCATED` and period matches; legacy branch for pre-ledger months |
| `validation.ts` | sale input, allocation rows, target instruction fields; returns `{ valid, errors }` like existing validation |
| `audit.ts` | `writeAuditEntry(tx, { entityType, entityId, parentEntityId?, action, before, after, actor, reason? })` |
| `service.ts` (Phase 3) | core mutations taking `actor: User` explicitly, so scripts can test them without cookies |
| `actions.ts` (Phase 3) | thin `"use server"` wrappers: `getCurrentUser()` → permission check → service |

---

## 5. Server actions and reads (Phase 3)

Follows the existing pattern (server actions returning `{ success, error, fieldErrors }`), not REST routes. Every mutation: validate → one `prisma.$transaction` containing the change + audit entries → return server-derived values.

| Action | Role | Behaviour / audit |
|---|---|---|
| `saveOutcomeTargetsAction` (existing, extended) | IT | Adds month-level `setByInstructionOf` + `instructionDate`; margin stays per person. Writes an audit entry per created/changed row; unchanged rows skipped. |
| `deleteOutcomeTargetAction(id)` | IT | New. DELETE audit with `before`. |
| `createSaleAction` | IT | Status `PENDING_ALLOCATION`. CREATE audit. |
| `updateSaleAction(id, expectedUpdatedAt, …)` | IT | Conflict error if `updatedAt` changed. If quantity changed on an allocated sale, re-split with the same shares and re-derive values (UPDATE audit per allocation). |
| `deleteSaleAction(id, expectedUpdatedAt)` | IT | Deletes allocations (DELETE audit each) then the sale (DELETE audit). |
| `saveSaleAllocationsAction(saleId, expectedUpdatedAt, rows[{userId, sharePercent, marginPerUnit}])` | IT | Replaces the whole set atomically (shares must always total 100). Diffs by userId → CREATE/UPDATE/DELETE audits. Status → `ALLOCATED`; an empty set → `PENDING_ALLOCATION` (UPDATE audit on the sale). Editing one margin goes through this same action. |

Reads (server-side loaders used by pages): `getMonthSummary(product, year, month)` (target qty/value, achieved qty/value, % of value, legacy flag), `listPendingSales()`, `listSales(filters)`, `getSaleWithAllocations(id)`, `getAuditTrail(entityType, entityId)` (includes children via `parentEntityId`).

Errors: invalid shares → field errors with the running total; unauthorised → `"Only Administrators can …"`; stale edit → `"This sale was changed by someone else. Reload and try again."`. Locked months: none in slice 1 (approval/lock out of scope); extension point is a single `assertMonthEditable()` call in the service that currently always passes.

---

## 6. Screens (Phase 4)

New pages under the existing `/outcomes` section, inside the existing `AppShell`, CSS Modules using the existing tokens in `globals.css` (add only what is missing, e.g. spacing scale). Existing pages are not restyled.

| Route | Purpose |
|---|---|
| `/outcomes/targets` | Month/product picker; quantity and margin per person; "set by instruction of" + date; quantity per person (includes non-login staff and the driver); derived value shown after save. |
| `/outcomes/sales` | Sales list (filter by month/status) + Pending allocation list at the top. |
| `/outcomes/sales/new` | Manual sale: invoice no., customer, payment date, litres. |
| `/outcomes/sales/[id]` | Sale detail + Allocate: rows of person/share/margin, live running total, Save disabled until exactly 100.00; derived litres/value shown from the server response. Edit/delete sale. |
| `/outcomes/month` | Per person: target, achieved (derived), %; Pending allocation list. |
| `/outcomes/audit?type=&id=` | Read-only trail with field-level before → after. |

Existing `/outcomes`: keep; for ledger months, hide the self-entry form and read achievement from the ledger. Nav: add one "Sales ledger" entry. Decimals cross to the client as strings, not numbers. Live totals in the browser are display-only; the server recomputes everything.

---

## 7. Test plan

Run style: `npx tsx scripts/test-<name>.ts`, `check()` helper, exit 1 on failure.

**Phase 2 (pure, no DB):**
- `test-ledger-allocation.ts`: 80,000 × 80 = 6,400,000.00; shares 100.00 ok; 99.99 and 100.01 rejected; 0 and negative shares rejected; 3-dp share rejected; duplicate person rejected; 10,000 L 33.33/33.33/33.34; 100 L three ways 33.33/33.33/33.34 → sums exactly; 1,000.001 L 50/50 tie-break deterministic regardless of input order; 60/40 on 10,000 L → 6,000 / 4,000; value rounding half-up to 2 dp.
- `test-ledger-period.ts`: `2026-10-31` → Oct; `2026-11-01` → Nov; `2026-10-31T23:30:00Z` → Lagos Nov 1; invalid date `2026-02-30` rejected; ledger-start boundary.
- `test-ledger-achievement.ts`: pending sale excluded; only matching month/product/user summed; legacy month uses `OutcomeAchievement`; no rows → null (not 0), matching existing convention.

**Phase 3 (DB, development database only):**
- `test-ledger-service.ts`: refuses to run unless `LEDGER_TEST_DB=dev` is set (so it can't run by accident against a future production URL). Covers: non-admin rejected for each mutation; invalid shares rejected and nothing written; every mutation writes the right audit entries with before/after; forced audit failure rolls back the change; stale `expectedUpdatedAt` rejected; quantity edit re-splits allocations; delete writes child audits. Uses a reserved test period (year 2099) and cleans up its own non-audit rows (audit rows remain by design, tagged with a test reason).

**Existing tests (decided):** fix `test-outcomes-calculations.ts` (wrong expected constant → `996913.4985`) and `test-outcomes-validation.ts` (whitespace case) so the whole suite is green.

**Phase 5:** the five end-to-end scenarios in the browser, plus `npx tsc --noEmit` and `npm run lint`.

---

## 8. Risks

1. **Single database**: dev is confirmed, but there is no separate test database; DB tests share it with dev data (mitigated by the reserved 2099 test period).
2. **Conflict of interest**: Yaroh holds a target and allocates sales; month approval/lock is out of scope, so slice 1 relies on the audit trail alone. Past months stay editable.
3. **Decimal → number leaks**: the existing page converts Decimals to JS numbers for display. New screens must pass strings; any client-side maths is display-only.
4. **Date drift**: `@db.Date` comes back as UTC midnight; local getters on a non-UTC machine would shift the day. Mitigated by string handling and the boundary tests.
5. **Neon interactive transactions** have a short default timeout; keep each transaction to the change + audit rows (no external calls inside).
6. **Audit trigger** blocks any future cleanup or cascade on `AuditEntry` (intended); test data in the dev DB accumulates audit rows.
7. **Boss's access shrinks (accepted, decided):** as MANAGEMENT, Stephanie loses leads/orders/daily-price/Outcomes-console access. If she needs any of these back, that's a per-feature decision for Yaroh.
8. **Password sign-in is a new attack surface:** hashed with scrypt, generic error messages, attempt limiting, and limited to users without Microsoft accounts. Passwords are set by IT through the script and never logged or committed.
9. **Renaming the `ADMIN` enum value** must ship together with the matching code changes (in the same Phase 1 commit), or the type-check fails and role checks break.
10. **Existing tests are red/commented out** (fix decided); until fixed, "run all tests" shows 2 failures unrelated to this slice unless fixed.

## 9. Ambiguities and contradictions

**Standard vs code**
- §5.3 achievement is derived from the ledger, but the code lets staff **self-enter** achievements (`saveOutcomeAchievementAction`). Plan: retire it for ledger months.
- §6.4 every target change is audited, but target saves today write no audit and there is no delete.
- §2 boss has no target: code excludes her **by hard-coded name** while she remains ADMIN; the commented-out domain test expected all ADMINs to be ineligible.
- §5.3 says `OutcomeAchievement` "becomes a computed summary". Plan computes on read and does not store it; tell me if you want a materialised summary.
- Float quantities in `Delivery`/`InternalOrder`/`QuoteRequest`: not copied; not changed (out of scope).
- `getCurrentOutcomePeriod()` and the Outcomes page use server-local time, not Lagos.

**Standard is silent or ambiguous**
- §5.1 "margin is the same for everyone" but `OutcomeTarget` stores margin per row. Plan: one shared input in the UI, written to every row; the server does not reject differing legacy values.
- §6.3 margin per allocation vs per sale: two people on the same sale can have different margins. Plan: prefill one margin for the sale, editable per row.
- What "achieved %" means when actual margins differ from the target margin: plan shows **value %** as the headline and litres achieved vs target litres alongside.
- §2 "another sign-in method or a no-login staff record": plan does no-login records only.
- §10.6 advance/over-payments, credit notes: manual entry records whatever Yaroh enters; no special handling.
- Invoice number uniqueness and whether the same invoice can be entered twice (partial payments).
- How non-login staff and the driver's `User` are created (screen vs script) — not covered by any phase's screen list.
- Who besides admins may see the month view (do staff see their own row?).

---

## 10. Questions for Yaroh

### Round 1: answered 2026-10-03
All 11 answers are recorded in `docs/slice-1-decisions.md`: dev DB confirmed; ledger starts October 2026; roles match jobs; the driver uses the app without Microsoft; staff records are created by a script; the manual achievement form is IT-only; margin per person per allocation; repeated invoice numbers allowed; Finance read-only and staff see their own row; fix the two failing tests; reject future payment dates.

### Round 2: answered 2026-10-03
Recorded in `docs/slice-1-decisions.md`: (A) the driver signs in with a username + password set by IT, hashed, using the same session; built in slice 1. (B) ADMIN becomes IT and the former ADMIN features belong only to IT; Stephanie → MANAGEMENT; Celestine → DRIVER. (C) The IT achievement form covers months before October 2026 only, audited. (D) Each person keeps their own target margin.

No open questions remain for Phase 0.
