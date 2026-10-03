# Phase 5 — Verification and summary

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`. Also read `docs/slice-1-plan.md` (approved plan).

## How this phase runs (two steps, with a gate)

**Step A — Proposal only.** Change NO files. Output a proposal of exactly what you will do, in the structure requested below. Then stop and wait.

**Step B — Build.** Start only when Yaroh replies beginning with `APPROVED`. First, if Yaroh listed changes, append each one to `docs/slice-1-decisions.md` (dated, tagged with this phase) and apply them as overrides. Then build ONLY what the approved proposal (plus changes) contains. Anything not in it is out of scope. If you find something necessary that is not in it, stop and ask instead of adding it.

Always: work on branch `slice-1-sales-ledger`; never run migrations or seeds against production (check and state which database `DATABASE_URL` points to before any Prisma migrate command); Decimal for money and litres; derived values computed on the server; audit entry in the same transaction as every mutation; follow existing conventions; commit at the end of the phase; stop for review.

## Step A proposal must contain
- The checks you will run (full tests, type-check, lint) and the end-to-end scenarios below, with how you will run each.
- Any files you intend to touch (this phase should only fix defects and write docs).

## Scenarios (Step B)
1. Set an 80,000 L × ₦80 target (= ₦6,400,000) for one person.
2. Create a 10,000 L sale; allocate 60/40 between two people; check litres, values, achievement.
3. Try 60/30; it must be rejected.
4. Edit one allocation's margin; achievement updates; the audit trail shows before/after.
5. A sale left unallocated counts toward no one.

## Step B build
Run everything, fix defects, write `docs/slice-1-summary.md` (what was built, schema, decisions, known gaps, how slice 2 — Zoho payments into Pending allocation — plugs in), confirm no secrets or `.env` values were committed, commit.
