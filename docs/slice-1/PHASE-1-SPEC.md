# PHASE-1-SPEC — Schema and migrations

Branch `slice-1-sales-ledger`. Run with `docs/slice-1/build-from-spec-prompt.md`. Precedence still applies; this spec's Decisions section is appended to `docs/slice-1-decisions.md` before building.

---

## 1. Scope (build exactly this)

1. Schema changes in §3 to `prisma/schema.prisma`.
2. One migration `<timestamp>_slice1_sales_ledger`, with hand-edited SQL per §4.
3. Code changes needed to compile after the role rename, plus the eligibility rule (§5).
4. New script `scripts/seed-slice1-staff.ts` (§6), run once on the development database.
5. New test script `scripts/test-slice1-schema.ts` (§7).
6. Handoff `docs/slice-1-handoff.md` including the rollback steps in §8.

## 2. Out of scope (do not build)

- Password-login route, login form, attempt limiting logic, setting any password (Phase 3/4).
- Any role gating of existing pages or `src/proxy.ts`. Delivery features, `Driver`/`Delivery` behaviour and delivery pages are not touched.
- Domain functions, server actions, screens, nav, `src/lib/ledger/*` (Phases 2–4).
- Fixing `test-outcomes-calculations.ts` / `test-outcomes-validation.ts`; reviving the commented-out tests (Phase 2).
- Month approval / lock (out of slice 1; no placeholder in schema).
- Sale money fields (payment amount, invoice amount, AGO line amount) and Zoho item mapping (slice 2).
- `REVERSED` sale status and any CHECK on quantities.
- Audit entity types for users/roles/passwords.
- Changing user-facing text such as "Only Administrators can …".
- Float columns elsewhere (`Delivery`, `InternalOrder`, `QuoteRequest`).

---

## 3. Schema (exact)

### 3.1 Enums
```prisma
enum UserRole {
  IT                    // renamed from ADMIN (same position, existing rows keep it)
  BUSINESS_DEVELOPMENT
  SALES
  OPERATIONS
  FINANCE
  MANAGEMENT
  DRIVER
}

enum SaleSource      { MANUAL ZOHO }
enum SaleStatus      { PENDING_ALLOCATION ALLOCATED }
enum AuditAction     { CREATE UPDATE DELETE }
enum AuditEntityType { OUTCOME_TARGET OUTCOME_ACHIEVEMENT SALE_RECORD SALE_ALLOCATION }
```
(Write the new enums in the file's existing multi-line style.)

### 3.2 `User` — changed/added fields only
```prisma
entraId String? @unique          // was String @unique

// Non-Microsoft sign-in (route built in Phase 3). Only for users with entraId = null.
username         String?   @unique  // stored lowercase (enforced in Phase 3 code)
passwordHash     String?            // "scrypt$<salt>$<hash>"; never logged or sent to the client
failedLoginCount Int       @default(0)
lockedUntil      DateTime?

// --- Sales ledger (slice 1) ---
driver                 Driver?
saleRecordsCreated     SaleRecord[]     @relation("SaleRecordCreatedBy")
saleRecordsUpdated     SaleRecord[]     @relation("SaleRecordUpdatedBy")
saleAllocations        SaleAllocation[] @relation("SaleAllocationStaff")
saleAllocationsCreated SaleAllocation[] @relation("SaleAllocationCreatedBy")
saleAllocationsUpdated SaleAllocation[] @relation("SaleAllocationUpdatedBy")
auditEntries           AuditEntry[]     @relation("AuditEntryActor")
```
Update the `User` doc comment: `entraId` is null for staff without Microsoft accounts.

### 3.3 `Driver` — add
```prisma
userId String? @unique
user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
```

### 3.4 `OutcomeTarget` — add
```prisma
/// Who instructed this target (free text, e.g. the boss's name). Required by
/// the slice-1 target flow; null on legacy rows.
setByInstructionOf String?
/// Africa/Lagos calendar date of the instruction. Null on legacy rows.
instructionDate    DateTime? @db.Date
```

### 3.5 `SaleRecord` — new
```prisma
model SaleRecord {
  id String @id @default(cuid())

  product OutcomeProduct
  source  SaleSource @default(MANUAL)

  zohoPaymentId  String? @unique
  invoiceNumber  String          // not unique: partial payments
  customerName   String
  zohoCustomerId String?

  /// Africa/Lagos calendar date the money arrived.
  paymentDate DateTime @db.Date
  /// Server-derived from paymentDate; recomputed whenever paymentDate changes.
  periodYear  Int
  periodMonth Int

  totalQuantity Decimal     @db.Decimal(20, 3)
  unit          OutcomeUnit

  status SaleStatus @default(PENDING_ALLOCATION)

  /// Reversal hook; unused in slice 1.
  reversesSaleId String?
  reversesSale   SaleRecord?  @relation("SaleReversal", fields: [reversesSaleId], references: [id], onDelete: Restrict)
  reversedBy     SaleRecord[] @relation("SaleReversal")

  notes String?

  createdById String
  createdBy   User    @relation("SaleRecordCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  updatedById String?
  updatedBy   User?   @relation("SaleRecordUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt   // optimistic-concurrency token in Phase 3

  allocations SaleAllocation[]

  @@index([product, periodYear, periodMonth, status])
  @@index([status])
  @@index([invoiceNumber])
  @@index([createdById])
}
```

### 3.6 `SaleAllocation` — new
```prisma
model SaleAllocation {
  id String @id @default(cuid())

  saleRecordId String
  saleRecord   SaleRecord @relation(fields: [saleRecordId], references: [id], onDelete: Restrict)

  userId String
  user   User   @relation("SaleAllocationStaff", fields: [userId], references: [id], onDelete: Restrict)

  sharePercent   Decimal @db.Decimal(5, 2)   // CHECK > 0 AND <= 100
  quantity       Decimal @db.Decimal(20, 3)  // server-derived
  marginPerUnit  Decimal @db.Decimal(18, 4)  // CHECK >= 0
  generatedValue Decimal @db.Decimal(30, 2)  // server-derived

  createdById String
  createdBy   User    @relation("SaleAllocationCreatedBy", fields: [createdById], references: [id], onDelete: Restrict)
  updatedById String?
  updatedBy   User?   @relation("SaleAllocationUpdatedBy", fields: [updatedById], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([saleRecordId, userId])
  @@index([userId])
}
```

### 3.7 `AuditEntry` — new (append-only)
```prisma
model AuditEntry {
  id String @id @default(cuid())

  entityType     AuditEntityType
  entityId       String          // no FK: entity may be deleted later
  parentEntityId String?         // allocations: the sale id
  action         AuditAction

  before Json?   // null on CREATE; Decimals as strings
  after  Json?   // null on DELETE

  actorUserId String
  actor       User   @relation("AuditEntryActor", fields: [actorUserId], references: [id], onDelete: Restrict)
  actorName   String // snapshot
  actorRole   String // snapshot

  reason String?

  createdAt DateTime @default(now())

  @@index([entityType, entityId, createdAt])
  @@index([parentEntityId])
  @@index([actorUserId])
  @@index([createdAt])
}
```

---

## 4. Migration procedure

1. Print which database `DATABASE_URL` points to (host and database name only, no credentials). Must be the Neon dev host `ep-lucky-bar-ayspidqx…` / `neondb`. Otherwise STOP.
2. `npx prisma migrate status`. If it reports drift, failed or unapplied migrations, STOP and report.
3. `npx prisma migrate dev --create-only --name slice1_sales_ledger`.
   - **If Prisma offers or asks to reset the database, answer no and STOP.** Never reset.
   - If a non-interactive warning blocks `--create-only`, create the folder `prisma/migrations/<YYYYMMDDHHMMSS>_slice1_sales_ledger/` by hand and generate the SQL with `npx prisma migrate diff` (check `--help` for the Prisma 7 flags: from the config datasource to `prisma/schema.prisma`, `--script`).
4. Hand-edit `migration.sql`:
   - **Replace** any `UserRole` recreate/cast block (`UserRole_new`, `DROP TYPE`, `USING`) with:
     ```sql
     ALTER TYPE "UserRole" RENAME VALUE 'ADMIN' TO 'IT';
     ALTER TYPE "UserRole" ADD VALUE 'MANAGEMENT';
     ALTER TYPE "UserRole" ADD VALUE 'DRIVER';
     ```
     Do not use the new values anywhere in this migration (Postgres forbids it in the same transaction).
   - Keep everything else Prisma generated (`entraId DROP NOT NULL`, new columns, tables, enums, FKs, indexes).
   - **Append**:
     ```sql
     -- Allocation safeguards
     ALTER TABLE "SaleAllocation"
       ADD CONSTRAINT "SaleAllocation_sharePercent_range" CHECK ("sharePercent" > 0 AND "sharePercent" <= 100),
       ADD CONSTRAINT "SaleAllocation_marginPerUnit_nonnegative" CHECK ("marginPerUnit" >= 0);

     -- AuditEntry is append-only
     CREATE FUNCTION "audit_entry_append_only"() RETURNS trigger AS $$
     BEGIN
       RAISE EXCEPTION 'AuditEntry is append-only';
     END;
     $$ LANGUAGE plpgsql;

     CREATE TRIGGER "AuditEntry_no_update_delete"
       BEFORE UPDATE OR DELETE ON "AuditEntry"
       FOR EACH ROW EXECUTE FUNCTION "audit_entry_append_only"();

     CREATE TRIGGER "AuditEntry_no_truncate"
       BEFORE TRUNCATE ON "AuditEntry"
       FOR EACH STATEMENT EXECUTE FUNCTION "audit_entry_append_only"();
     ```
5. Apply: `npx prisma migrate dev` (same reset rule as step 3). Then `npx prisma generate`.
6. `npx prisma migrate status` must show everything applied. A second `npx prisma migrate dev --create-only --name check` must report no changes. If it generates a migration, delete that empty or unexpected folder and report.

---

## 5. Code changes (only these)

| File | Change |
|---|---|
| `src/lib/commercial/permissions.ts` | Every `UserRole.ADMIN` → `UserRole.IT`; doc comments "ADMIN"/"Admin" → "IT". No other logic change. |
| `src/app/commercial/leads/[id]/page.tsx` (~l.166) | `UserRole.ADMIN` → `UserRole.IT`. |
| `src/app/outcomes/page.tsx` (~l.342) | `currentUser.role === "ADMIN"` → `=== "IT"`. Keep the variable name `isAdmin`. |
| `src/lib/outcomes/actions.ts` (~l.150) | `!== "ADMIN"` → `!== "IT"`; keep the message text. Check the rest of the file for other `"ADMIN"` literals and change them the same way. |
| `src/lib/outcomes/eligibility.ts` | Remove `MANAGING_DIRECTOR_NAME`. Rule: `status === "ACTIVE" && role !== "MANAGEMENT"`. Keep exported signatures (`Pick<User, "name" \| "role" \| "status">`). Rewrite the comments to match. |
| `src/lib/notificationAccess.ts` | `canSeeAllNotifications(user: { entraId: string \| null })`; return `false` when `entraId` is null. Comment "ADMIN" → "IT". |
| `scripts/seed-initial-users.ts` | "IT Alphabrooks Energy" → `"IT"`; Eke Nwannediya Stephanie → `"MANAGEMENT"`. |
| `scripts/test-outcomes-domain.ts`, `scripts/test-outcomes-persistence.ts` | Leave as they are (commented out). |

Then grep `src/` and `scripts/` (excluding `src/generated`) for `ADMIN` and fix any remaining compile-relevant use the same way. List every file touched in the handoff.

---

## 6. `scripts/seed-slice1-staff.ts`

Style: `import "dotenv/config"`, `import { prisma } from "../src/lib/prisma"`, like `seed-initial-users.ts`.

- On start, print the target database host and name (no credentials). Refuse to run unless the `--yes` argument is passed.
- Everything happens in one `prisma.$transaction`. Idempotent: a second run changes nothing and says so.
  1. User with `entraId = "f8fc95e8-a5ff-4d4a-af9a-09a468931aed"` (Eke Nwannediya Stephanie) → `role = MANAGEMENT`. If not found, throw.
  2. Verify the user with `entraId = "68349eb7-ffbc-42f0-abd3-e9e6efddbb55"` has `role = IT`. If not, throw (do not change it).
  3. Find `Driver` rows with `name = "Celestine"`. There must be exactly one, otherwise throw. If `driver.userId` is set, skip. Otherwise create `User { name: driver.name, role: DRIVER, entraId: null, phone: driver.phone, status: ACTIVE }` (no username, no password) and set `driver.userId`.
  4. Afterwards, throw if any user still has `role = IT` other than the one in step 2.
- Print one line per action: `updated` / `unchanged` / `created`.
- Run on dev: `npx tsx scripts/seed-slice1-staff.ts --yes`.
- Production (later, not in this phase): run straight after `prisma migrate deploy`. Document this in the handoff.

---

## 7. Tests — `scripts/test-slice1-schema.ts`

Style matches existing `scripts/test-*.ts`: `check(label, actual, expected)`, plus a helper `expectRejects(label, fn)`. Exit code 1 on any failure.
Refuse to run unless `LEDGER_TEST_DB=dev`. **Leave no rows behind:** each case runs in its own `prisma.$transaction(async (tx) => …)` that ends by throwing a sentinel `Rollback` error, which the helper catches. Cases that expect a DB error create their fixtures and attempt the violation in the same transaction.

| # | Case | Expected |
|---|---|---|
| 1 | Enum `UserRole` values (from `pg_enum`) | exactly IT, BUSINESS_DEVELOPMENT, SALES, OPERATIONS, FINANCE, MANAGEMENT, DRIVER |
| 2 | No user has role `ADMIN`; Stephanie (by entraId) is MANAGEMENT; 68349eb7… is IT; exactly 1 IT user | true |
| 3 | Driver "Celestine" has `userId`; that user has role DRIVER, `entraId` null, `passwordHash` null | true |
| 4 | Two new users with `entraId = null` in one transaction | both inserted |
| 5 | Two users with the same `username` | second rejected |
| 6 | `failedLoginCount` default on a new user | 0 |
| 7 | 5 existing Sept-2026 `OutcomeTarget` rows still present; `setByInstructionOf`/`instructionDate` null | count 5, nulls |
| 8 | SaleRecord with `paymentDate "2099-01-15"` read back via `toISOString().slice(0,10)` | `"2099-01-15"` |
| 9 | Two SaleRecords with `zohoPaymentId` null; two with the same non-null id | nulls ok; duplicate rejected |
| 10 | Two SaleRecords with the same `invoiceNumber` | allowed |
| 11 | SaleAllocation `sharePercent` 0, −1, 100.01 | each rejected |
| 12 | SaleAllocation `sharePercent` 0.01 and 100.00 | accepted |
| 13 | SaleAllocation `marginPerUnit` −0.0001 / 0 | rejected / accepted |
| 14 | Two allocations, same sale + same user | second rejected |
| 15 | Delete a SaleRecord that has an allocation | rejected (Restrict) |
| 16 | Insert AuditEntry, then `UPDATE` it (raw SQL) | rejected with "append-only" |
| 17 | Insert AuditEntry, then `DELETE` it | rejected with "append-only" |
| 18 | AuditEntry `before`/`after` JSON with a Decimal-as-string round-trips | equal |
| 19 | Decimal precision: `totalQuantity "12345.678"` round-trips as `"12345.678"` | equal |

Test fixtures use periods in 2099 and invoice numbers prefixed `TEST-`.

### Also run and report
- `npx prisma validate`
- `npx tsc --noEmit` → must pass.
- `npm run lint` → report the result; fix only issues in files this phase touched.
- `npx tsx scripts/test-profitability-calculations.ts` → must still pass.
- `npx tsx scripts/test-outcomes-calculations.ts` and `test-outcomes-validation.ts` → report; the known failures are expected (fixed in Phase 2).

---

## 8. Rollback (write into the handoff; do not run)

1. `DROP TRIGGER "AuditEntry_no_update_delete"`, `"AuditEntry_no_truncate"`; `DROP FUNCTION "audit_entry_append_only"`.
2. `DROP TABLE "AuditEntry"`, `"SaleAllocation"`, `"SaleRecord"`; drop enums `AuditEntityType`, `AuditAction`, `SaleStatus`, `SaleSource`.
3. Drop `Driver.userId`; drop `OutcomeTarget.setByInstructionOf`, `instructionDate`; drop `User.username`, `passwordHash`, `failedLoginCount`, `lockedUntil`.
4. Delete DRIVER users created by the script (after step 3 unlinks them). Set MANAGEMENT users to IT.
5. Recreate `UserRole` without MANAGEMENT/DRIVER (Postgres can't drop enum values), then `RENAME VALUE 'IT' TO 'ADMIN'`.
6. Restore `entraId NOT NULL` only if no user has a null `entraId`.
7. Revert the code commit; delete the migration folder and its `_prisma_migrations` row.

---

## 9. Notes for later phases (do not build now)

- **Before Phase 3 enables password sign-in:** decide what DRIVER can open. Today any signed-in user reaches any page that only checks for a session. Delivery pages stay unchanged in slice 1.
- `getCurrentUser()` returns the full `User`, now including `passwordHash`. Phase 3 must make sure it never reaches the client. `/api/auth/me` already picks fields explicitly.
- When `paymentDate` changes, Phase 3 recomputes `periodYear`/`periodMonth`. Allocation saves must bump the sale's `updatedAt`.

---

## 10. Decisions (append to `docs/slice-1-decisions.md`, tagged [Phase 1])

1. Phase 1 adds `User.username` (unique, stored lowercase), `passwordHash`, `failedLoginCount Int @default(0)`, `lockedUntil DateTime?`. Attempt limiting is stored in the database. The password-login route and form are built in Phase 3, the login-page link in Phase 4.
2. `scripts/seed-slice1-staff.ts` runs on dev straight after the Phase 1 migration: Stephanie → MANAGEMENT; creates the Celestine `User` (DRIVER, no Microsoft account, no password yet) linked to the existing `Driver`. On production it is a documented step run straight after deploying the migration. (supersedes: plan §1.1 implying the role move happens only through the rename)
3. Month approval and lock are out of slice 1, with no schema placeholder. Slice 1 relies on the audit trail. (supersedes: standard §2 "approves month-end allocation", §6.6)
4. `AuditEntry` is append-only, enforced by a database trigger on UPDATE, DELETE and TRUNCATE as well as in code. (supersedes: plan §1.7 "proposed")
5. Database CHECK constraints: `SaleAllocation.sharePercent > 0 AND <= 100`; `SaleAllocation.marginPerUnit >= 0`. No CHECK on quantities, because the reversal design is still open.
6. Delivery features are not changed in slice 1; they will be rebuilt later. No role gating of existing pages in Phase 1. DRIVER access to non-Outcomes pages must be decided before Phase 3 enables password sign-in.
7. `AuditEntityType` includes `OUTCOME_ACHIEVEMENT` from the first migration. (supersedes: plan §1.4 list)
8. The Outcomes eligibility rule changes to `ACTIVE && role ≠ MANAGEMENT` in Phase 1, together with the role rename.
9. Sale money fields (payment/invoice amounts for proportional AGO crediting) are deferred to slice 2 as an additive migration.
