# Alpha Brooks operating engine

Stack: Next.js 16, React 19, TypeScript, Prisma 7, CSS Modules. Internal operations dashboard for Alpha Brooks Energy.

## Document precedence (highest first)
1. `docs/slice-1-decisions.md` — Yaroh's changes made during review. Overrides everything.
2. The current phase prompt (`docs/slice-1/phase-N-*.md`).
3. `docs/slice-1-master-prompt.md`.
4. `docs/work-management-standard-v1.md`.
If a change is requested in conversation, append it to `docs/slice-1-decisions.md` before building.

## How phases run
Each phase has two steps: A) proposal only, no file changes; B) build, only after Yaroh replies starting with `APPROVED`. Build only what the approved proposal contains. Stop at the end of every phase.

## Rules
- Never run migrations or seeds against a production database. Check `DATABASE_URL` first and say which database it points to.
- Money and litres use Decimal, never floats. Derived values are computed on the server only.
- Every change to targets, sales or allocations writes an audit entry in the same transaction.
- Check permissions on the server, not just in the UI.
- Follow existing conventions (CSS Modules, file layout, migration naming, `scripts/test-*.ts` style).
- Commit at the end of each phase on the slice branch. Never commit `.env` or secrets.
- Keep changes small; don't refactor unrelated code.