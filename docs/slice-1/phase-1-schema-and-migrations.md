# Phase 1 — Schema and migrations

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`. Also read `docs/slice-1-plan.md` (approved plan).

## How this phase runs (two steps, with a gate)

**Step A — Proposal only.** Change NO files. Output a proposal of exactly what you will do, in the structure requested below. Then stop and wait.

**Step B — Build.** Start only when Yaroh replies beginning with `APPROVED`. First, if Yaroh listed changes, append each one to `docs/slice-1-decisions.md` (dated, tagged with this phase) and apply them as overrides. Then build ONLY what the approved proposal (plus changes) contains. Anything not in it is out of scope. If you find something necessary that is not in it, stop and ask instead of adding it.

Always: work on branch `slice-1-sales-ledger`; never run migrations or seeds against production (check and state which database `DATABASE_URL` points to before any Prisma migrate command); Decimal for money and litres; derived values computed on the server; audit entry in the same transaction as every mutation; follow existing conventions; commit at the end of the phase; stop for review.

## Step A proposal must contain
- The full list of models/enums/fields/indexes/relations to add or change, written out (not described loosely): `User.entraId` optional + new roles; `Driver` ↔ `User` link; `OutcomeTarget` additions (`setByInstructionOf`, `instructionDate`); `SaleRecord`; `SaleAllocation`; append-only `AuditEntry`.
- For each model: field names, types, nullability, defaults, unique constraints, indexes.
- How existing data is preserved; any backfill; how to roll back.
- Which database the migration will run against.
- A list of anything in the standard you chose not to implement in this phase.

## Step B build
Edit `prisma/schema.prisma`, generate migration(s) against the development database, run `prisma validate` and the type-check, commit. No application code beyond what is needed to keep the project compiling.
