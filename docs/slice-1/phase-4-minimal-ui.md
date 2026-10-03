# Phase 4 — Minimal UI

Read `CLAUDE.md` first. Precedence if documents disagree: `docs/slice-1-decisions.md` > this prompt > `docs/slice-1-master-prompt.md` > `docs/work-management-standard-v1.md`. Also read `docs/slice-1-plan.md` (approved plan).

## How this phase runs (two steps, with a gate)

**Step A — Proposal only.** Change NO files. Output a proposal of exactly what you will do, in the structure requested below. Then stop and wait.

**Step B — Build.** Start only when Yaroh replies beginning with `APPROVED`. First, if Yaroh listed changes, append each one to `docs/slice-1-decisions.md` (dated, tagged with this phase) and apply them as overrides. Then build ONLY what the approved proposal (plus changes) contains. Anything not in it is out of scope. If you find something necessary that is not in it, stop and ask instead of adding it.

Always: work on branch `slice-1-sales-ledger`; never run migrations or seeds against production (check and state which database `DATABASE_URL` points to before any Prisma migrate command); Decimal for money and litres; derived values computed on the server; audit entry in the same transaction as every mutation; follow existing conventions; commit at the end of the phase; stop for review.

## Step A proposal must contain
- For each screen (Targets, Sales, Allocate, Month view with Pending allocation, Audit trail): route, a plain-text layout sketch, fields, validation and empty/error states.
- How the Allocate screen shows the running 100% total and blocks saving until it is exactly 100%.
- The CSS variables/design tokens you will define (green primary, complementary neutrals, amber accent, generous spacing, responsive down to phone).
- Which existing components/styles you will reuse and what you will leave untouched. Note: the full dashboard redesign is a later slice; do not restyle existing pages.

## Step B build
Build the approved screens with CSS Modules. Use the preview/browser to verify each screen loads and works with development data. Commit.
