# Slice 1 decisions

This file OVERRIDES every other document (phase prompts, master prompt, standard) wherever they disagree.
Claude Code appends here whenever Yaroh changes or adds a requirement during review. Never delete entries; if a decision changes, add a new entry that supersedes the old one and say so.

Format: `- YYYY-MM-DD [Phase N] Decision. (supersedes: <earlier entry or document section, if any>)`

## Entries

- 2026-10-03 [Phase 0] The Neon database in `.env` (`ep-lucky-bar-ayspidqx…` / `neondb`) is the development database. Migrations, seeds and DB tests for slice 1 may run against it. (supersedes: plan §0 "treating it as production")
- 2026-10-03 [Phase 0] First ledger month is October 2026. Months before it use legacy `OutcomeAchievement` rows, read-only.
- 2026-10-03 [Phase 0] Every person gets a role that matches their actual job; roles may share features. When a feature's audience is unclear (everyone / some roles / one person), ask Yaroh before building it.
- 2026-10-03 [Phase 0] The driver (existing `Driver` "Celestine") has no Microsoft account but must be able to use the app. A second non-Microsoft staff member exists but their identity/role is unknown for now; the design must allow adding them later.
- 2026-10-03 [Phase 0] Non-Microsoft staff records (and the Driver↔User link) are created by a one-off script, not an admin form.
- 2026-10-03 [Phase 0] The manual achievement entry form is available only to IT (no longer to every staff member).
- 2026-10-03 [Phase 0] Margin per unit is stored per person on every allocation. It is usually the same for everyone, but each person can have their own. (supersedes: master prompt "margin per unit is the same for everyone" as an enforced rule)
- 2026-10-03 [Phase 0] The same invoice number may appear on more than one sale (partial payments).
- 2026-10-03 [Phase 0] FINANCE is read-only for now. Ordinary staff can see their own target/achievement row.
- 2026-10-03 [Phase 0] Fix the two failing existing tests (`test-outcomes-calculations.ts`, `test-outcomes-validation.ts`) in this slice.
- 2026-10-03 [Phase 0] Sale payment dates in the future (Africa/Lagos today) are rejected.
- 2026-10-03 [Phase 0] Driver sign-in: username + password/PIN set by IT through the one-off script, stored only as a salted hash, using the same `ab_session` session as Microsoft sign-in. Built in slice 1. In slice 1 the driver sees only their own target/achievement row.
- 2026-10-03 [Phase 0] Roles: every feature that is ADMIN-only today belongs only to IT. The `ADMIN` role becomes `IT`. Eke Nwannediya Stephanie → `MANAGEMENT` (no longer has the former ADMIN features); Emakuneyi Oghenenyerhovwo (Yaroh) → `IT`; Celestine → `DRIVER`. Target eligibility = ACTIVE and role ≠ MANAGEMENT (replaces the hard-coded MD name). (supersedes: master prompt "admin-level users"; 2026-10-03 role-mapping question)
- 2026-10-03 [Phase 0] The IT-only manual achievement form covers months before October 2026 only, and every entry is audited. From October 2026, achievement is corrected only by editing sales and allocations.
- 2026-10-03 [Phase 0] Targets keep a separate margin per person (no single shared margin for the month). (supersedes: standard §5.1 "margin per unit is the same for everyone")
- 2026-10-03 [Phase 1] Phase 1 adds `User.username` (unique, stored lowercase), `passwordHash`, `failedLoginCount Int @default(0)`, `lockedUntil DateTime?`. Attempt limiting is stored in the database. The password-login route and form are built in Phase 3, the login-page link in Phase 4.
- 2026-10-03 [Phase 1] `scripts/seed-slice1-staff.ts` runs on dev straight after the Phase 1 migration: Stephanie → MANAGEMENT; creates the Celestine `User` (DRIVER, no Microsoft account, no password yet) linked to the existing `Driver`. On production it is a documented step run straight after deploying the migration. (supersedes: plan §1.1 implying the role move happens only through the rename)
- 2026-10-03 [Phase 1] Month approval and lock are out of slice 1, with no schema placeholder. Slice 1 relies on the audit trail. (supersedes: standard §2 "approves month-end allocation", §6.6)
- 2026-10-03 [Phase 1] `AuditEntry` is append-only, enforced by a database trigger on UPDATE, DELETE and TRUNCATE as well as in code. (supersedes: plan §1.7 "proposed")
- 2026-10-03 [Phase 1] Database CHECK constraints: `SaleAllocation.sharePercent > 0 AND <= 100`; `SaleAllocation.marginPerUnit >= 0`. No CHECK on quantities, because the reversal design is still open.
- 2026-10-03 [Phase 1] Delivery features are not changed in slice 1; they will be rebuilt later. No role gating of existing pages in Phase 1. DRIVER access to non-Outcomes pages must be decided before Phase 3 enables password sign-in.
- 2026-10-03 [Phase 1] `AuditEntityType` includes `OUTCOME_ACHIEVEMENT` from the first migration. (supersedes: plan §1.4 list)
- 2026-10-03 [Phase 1] The Outcomes eligibility rule changes to `ACTIVE && role ≠ MANAGEMENT` in Phase 1, together with the role rename.
- 2026-10-03 [Phase 1] Sale money fields (payment/invoice amounts for proportional AGO crediting) are deferred to slice 2 as an additive migration.
