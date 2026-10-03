# Phase 0 — Explore and plan (read-only)

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`.

**This phase has no build step.** The only file you may create is `docs/slice-1-plan.md`. Change nothing else.

## Do

1. Read `docs/work-management-standard-v1.md` (sections 2, 5, 6, 9, 10) and `docs/slice-1-master-prompt.md`.
2. Inspect: `prisma/schema.prisma`; existing Outcomes code and the `scripts/test-outcomes-*.ts` tests; user/session/auth code; existing audit-log patterns; where Outcomes pages and APIs live; how tests are run.
3. Write `docs/slice-1-plan.md` covering:
   - Proposed schema changes and how existing `OutcomeTarget` / `OutcomeAchievement` rows are handled (legacy months vs ledger months).
   - How `User.entraId` becomes optional; how non-Microsoft staff and the driver are represented; whether `Driver` links to `User`; new roles needed (driver, management/boss).
   - Rounding rule for splitting litres by share; timezone rule for deciding a payment's month (Africa/Lagos).
   - Screens and API list; test plan.
   - Risks, and every place the standard is ambiguous or contradicts the code.
4. End with a short numbered list of **questions for Yaroh**.

Then stop. Do not start Phase 1.
