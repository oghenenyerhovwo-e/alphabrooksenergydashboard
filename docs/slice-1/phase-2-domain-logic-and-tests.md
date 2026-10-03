# Phase 2 — Domain logic and tests (pure server code, no UI, no API)

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`. Also read `docs/slice-1-plan.md` (approved plan).

## How this phase runs (two steps, with a gate)

**Step A — Proposal only.** Change NO files. Output a proposal of exactly what you will do, in the structure requested below. Then stop and wait.

**Step B — Build.** Start only when Yaroh replies beginning with `APPROVED`. First, if Yaroh listed changes, append each one to `docs/slice-1-decisions.md` (dated, tagged with this phase) and apply them as overrides. Then build ONLY what the approved proposal (plus changes) contains. Anything not in it is out of scope. If you find something necessary that is not in it, stop and ask instead of adding it.

Always: work on branch `slice-1-sales-ledger`; never run migrations or seeds against production (check and state which database `DATABASE_URL` points to before any Prisma migrate command); Decimal for money and litres; derived values computed on the server; audit entry in the same transaction as every mutation; follow existing conventions; commit at the end of the phase; stop for review.

## Step A proposal must contain
- Function signatures and file locations for: target generated value; allocation split by share; allocation value; achievement for a person/product/month; month-of-payment (Africa/Lagos).
- The exact rounding rule for splitting litres so allocations sum exactly to the sale total.
- The exact rules for rejecting bad input (shares not totalling 100.00, zero/negative shares, duplicate people).
- How legacy `OutcomeAchievement` rows are treated for months before the ledger.
- The full list of test cases you will write (include: 80,000 L × ₦80 = ₦6,400,000; 99.99 and 100.01 totals; uneven three-way splits; duplicate person; pending sale excluded; month-boundary dates).

## Step B build
Implement the functions and tests in the existing test-script style, run them, report results, commit.
