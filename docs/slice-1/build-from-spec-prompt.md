# Build prompt (paste into Claude Code, with the reviewed PHASE-N-SPEC.md saved in docs/slice-1/)

Read `CLAUDE.md`, then `docs/slice-1/PHASE-N-SPEC.md` (replace N with the phase number).

**Mode: BUILD from the reviewed spec. There is no proposal step.**

1. **Preflight (read-only, brief):** check the spec against the repository. If any file, model, function or assumption in the spec doesn't match the repo, STOP and list the mismatches. Do not guess or work around them.
2. Append every item in the spec's "Decisions" section to `docs/slice-1-decisions.md` (dated, tagged with this phase).
3. Build ONLY what the spec contains. Out-of-scope items stay out. If something necessary is missing from the spec, stop and ask.
4. Run the tests/type-check the spec calls for. Report results.
5. Write `docs/slice-1-handoff.md` (overwrite it): under 100 lines, covering what exists now, file paths, model names and fields added, function signatures, how to run the tests, and known gaps. No secrets.
6. Commit on branch `slice-1-sales-ledger`. Stop.

Never run migrations or seeds against production; check and state which database `DATABASE_URL` points to before any Prisma migrate command.
