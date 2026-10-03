# Phase 3 — API / server actions with audit and permissions

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`. Also read `docs/slice-1-plan.md` (approved plan).

## How this phase runs (two steps, with a gate)

**Step A — Proposal only.** Change NO files. Output a proposal of exactly what you will do, in the structure requested below. Then stop and wait.

**Step B — Build.** Start only when Yaroh replies beginning with `APPROVED`. First, if Yaroh listed changes, append each one to `docs/slice-1-decisions.md` (dated, tagged with this phase) and apply them as overrides. Then build ONLY what the approved proposal (plus changes) contains. Anything not in it is out of scope. If you find something necessary that is not in it, stop and ask instead of adding it.

Always: work on branch `slice-1-sales-ledger`; never run migrations or seeds against production (check and state which database `DATABASE_URL` points to before any Prisma migrate command); Decimal for money and litres; derived values computed on the server; audit entry in the same transaction as every mutation; follow existing conventions; commit at the end of the phase; stop for review.

## Step A proposal must contain
- The list of endpoints/server actions: method/name, input, output, and which role may call it.
- A permissions table (admin, finance, management/boss, other staff): who can create/edit/delete targets, sales, allocations and who can read the audit trail.
- The audit events written for each mutation (what is stored before/after).
- How each mutation is wrapped in a transaction with its audit entry.
- Error responses for invalid shares, unauthorised users, and locked/edit conflicts.
- The tests you will add.

## Step B build
Implement the approved endpoints with server-side authorisation, tests (including audit written on every mutation and rollback when the audit write fails), commit.
