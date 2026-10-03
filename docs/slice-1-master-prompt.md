# Slice 1 — Sales Ledger, Allocation, Audit Trail, Targets Rework

You are working in the Alpha Brooks operating engine (Next.js 16, React 19, Prisma 7, TypeScript, CSS Modules).

**Source of truth:** `docs/work-management-standard-v1.md`. Read it fully first. Where it disagrees with existing code, the standard wins. Sections that matter most for this slice: 2, 5, 6, 9, 10.

## Scope of slice 1 (and nothing more)

Build the manual sales ledger and everything it needs:

1. Staff records that don't require a Microsoft account (drivers and one other staff member).
2. Targets rework (monthly, per person, per product): `targetQuantity × targetMarginPerUnit = targetGeneratedValue`, server-derived.
3. A **sale record** (a payment received for AGO litres) and **allocations** of that sale to people (shares total exactly 100%).
4. Achievement **derived from the ledger**.
5. An append-only **audit trail** for every create/edit/delete of targets, sales and allocations.
6. Minimal working screens to use all of the above. Use CSS Modules and shared design tokens; the full visual rebuild is a later slice.

**Out of scope for this slice:** Zoho payment ingestion, tasks/subtasks/follow-ups, month approval/lock UI, rewards, pace/suggestions, the full dashboard redesign. Do not build them. You may leave clearly named extension points.

## Rules for the whole slice

- Work on branch `slice-1-sales-ledger`. Commit at the end of each phase with a clear message.
- **Never run migrations or seeds against a production database.** Before any Prisma migrate command, check which database `DATABASE_URL` points to and tell me. If it isn't clearly a development database, stop and ask.
- **Stop at the end of every phase.** Summarise what changed, show test results, list open questions, then wait for my approval before starting the next phase.
- Money and litres use `Decimal` (Prisma `Decimal` / a decimal library on the server). Never use JavaScript floats for money or litres. Note: existing `InternalOrder.quantity` is a `Float`; do not copy that pattern.
- All derived values (generated value, litres per allocation, achievement) are computed on the server. Clients never submit derived values.
- Every mutation writes an audit entry in the same database transaction as the change.
- Authorisation is enforced on the server, not only in the UI. Entering targets, creating sales and allocating are restricted to admin-level users. Finance and management roles can read, including the audit trail.
- Follow existing conventions: file layout, naming, error handling, CSS Modules, migration naming, and the style of existing `scripts/test-*.ts` test scripts. Discover how existing tests are run and use the same approach.
- No refunds in v1, but the model must allow a reversal to be added later without restructuring (for example a sale `status` field and a nullable `reversesSaleId`).
- Prefer small, reviewable commits. Do not refactor unrelated code.

---

## Phase 0 — Explore and plan (read-only)

Read-only. Do not edit files.

1. Read `docs/work-management-standard-v1.md` and `CLAUDE.md`.
2. Inspect `prisma/schema.prisma`, existing Outcomes code (models, validation, persistence, scripts `test-outcomes-*.ts`), `User`/session/auth code (`src/app/api/auth/*`), the existing audit log patterns, and where Outcomes pages and APIs live.
3. Produce a written plan (save to `docs/slice-1-plan.md`) covering:
   - Exact schema changes (see the proposal below) and how existing `OutcomeTarget` / `OutcomeAchievement` data will be handled (legacy months vs ledger months).
   - How `User.entraId` becomes optional and how non-Microsoft staff are represented. Include whether `Driver` links to `User`, and what new roles are needed (e.g. a driver role and a management role for the boss).
   - Rounding rule for splitting litres by share.
   - API/route and screen list.
   - Test plan.
   - Risks, and any place where the standard is ambiguous.
4. Stop and wait for my approval.

## Phase 1 — Schema and migrations

Proposal (adjust in the plan if the code suggests better, but keep the intent):

- `User`: `entraId` optional; add role values needed for driver and management.
- Link `Driver` to a `User` (optional relation) so the driver can hold a target.
- `OutcomeTarget`: add `setByInstructionOf` (text) and `instructionDate` (date). Keep the derived value server-authoritative.
- `SaleRecord`: id, product (existing `OutcomeProduct`), source (`MANUAL` now, `ZOHO` later), nullable `zohoPaymentId` (unique when present), invoice number, customer name, nullable `zohoCustomerId`, **payment date** (the date the money arrived; determines the month it counts in), total quantity (`Decimal(20,3)`), unit, status (`PENDING_ALLOCATION`, `ALLOCATED`), nullable `reversesSaleId`, created/updated by and timestamps.
- `SaleAllocation`: id, `saleRecordId`, `userId`, `sharePercent` (`Decimal(5,2)`), derived quantity, `marginPerUnit` (`Decimal(18,4)`), derived generated value (`Decimal(30,2)`), created/updated by and timestamps. Unique on (sale, user).
- `AuditEntry` (append-only): id, entity type, entity id, action (`CREATE`/`UPDATE`/`DELETE`), before (JSON), after (JSON), actor user id, actor name and role (snapshot), optional reason, created at. No update or delete operations anywhere in code for this table.
- Indexes for month/product/user queries. Backfill needed for existing rows must be safe and reversible.

Deliver: Prisma schema, migration(s) generated against a **development** database, and a short note on how to roll back. Run `prisma validate` and type-check. Commit. Stop.

## Phase 2 — Domain logic and tests

Pure server-side functions (no UI) with unit tests following the existing script style:

- `computeTargetGeneratedValue(quantity, marginPerUnit)` — example: 80,000 L × ₦80 = ₦6,400,000.
- `splitAllocation(totalQuantity, shares[])`:
  - shares must total exactly 100.00, otherwise reject;
  - litres split must sum exactly to the sale total (assign any rounding remainder deterministically, e.g. to the largest share, and document it);
  - reject zero/negative shares and duplicate people.
- `computeAllocationValue(quantity, marginPerUnit)`.
- `getAchievement(userId, product, year, month)` = sum of that person's allocations whose sale **payment date** falls in that month, only for `ALLOCATED` sales. Unallocated (`PENDING_ALLOCATION`) sales never count. Document how legacy `OutcomeAchievement` rows are treated for months before the ledger started.
- Month boundaries: decide and document the timezone (Africa/Lagos) for deciding which month a payment date belongs to, and test the boundary.
- Tests must cover: exact 100% shares, shares that total 99.99 or 100.01, three-way splits that don't divide evenly, a person in two allocations of the same sale (rejected), pending sale excluded from achievement, month-boundary payment dates.

Run all tests. Commit. Stop.

## Phase 3 — API / server actions with audit

Implement create/update/delete for targets, sales and allocations, plus read endpoints (target vs achievement by person and month; pending allocation queue; audit trail for an entity).

- Each mutation: validate input with the domain functions, perform changes and the audit entry in one transaction, return the server-derived values.
- Editing or deleting an allocated sale re-validates allocations and is fully audited with before/after.
- Server-side authorisation by role as described in the rules.
- Add tests (script style or route tests, whichever the repo supports) for: unauthorised users, invalid shares, audit entry written on every mutation, transaction rollback when the audit write fails.

Commit. Stop.

## Phase 4 — Minimal UI

Working, clean screens (reuse existing layout and CSS Modules; use CSS variables for colours/spacing so the later redesign is easy to apply — green primary with complementary neutrals and an amber accent, generous spacing, responsive):

1. **Targets**: set a person's monthly target (quantity, shared margin per unit, "set by instruction of" + date). Show the derived value. Staff list must include non-Microsoft staff and the driver.
2. **Sales**: list of sale records; create a manual sale (invoice number, customer, payment date, litres).
3. **Allocate**: for a sale, add people and share percentages with a live running total that must reach 100% before saving; show derived litres and value per person; enter margin per litre per allocation (editable).
4. **Month view**: each person's target, achieved (derived), and percentage, plus the **Pending allocation** list.
5. **Audit trail** view for an entity (read-only).

Use the Browser/preview to verify each screen actually loads and works with seeded development data. Commit. Stop.

## Phase 5 — Verification and review

1. Run the full test suite, type-check and lint. Fix issues.
2. Walk through these scenarios end to end in the running app and report results:
   - Set an 80,000 L × ₦80 target (= ₦6,400,000) for one person.
   - Create a 10,000 L sale and allocate it 60/40 between two people; check litres, values and achievement.
   - Try to save 60/30 — it must be rejected.
   - Edit the margin on one allocation — achievement updates and the audit trail shows before/after.
   - A sale left unallocated does not count toward anyone.
3. Write `docs/slice-1-summary.md`: what was built, schema, decisions, known gaps, and what slice 2 (Zoho payments → Pending allocation) can plug into.
4. Make sure no secrets or `.env` values were committed. Commit. Stop for my final review.

---

## Open assumptions from the standard (flag if the code contradicts them)

- Margin per sale is entered at allocation time (editable, audited); later prefilled from the Profitability module.
- A sale counts when money arrives; payment date decides the month.
- Everyone except the boss has a volume target; the margin per unit is the same for everyone each month; the boss decides targets and the admin enters them.
