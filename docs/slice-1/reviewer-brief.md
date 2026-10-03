# Reviewer brief (paste into the OTHER Claude account, with the attachments listed below)

You are helping me (Yaroh) design one build phase for the Alpha Brooks operating engine (Next.js 16, React 19, Prisma 7, TypeScript, CSS Modules). You cannot see my repository; you only see what I attach. Do not invent file paths or code you haven't been shown. If you need a file, ask me for it.

Attached:
1. `work-management-standard-v1.md` (product standard)
2. `slice-1-decisions.md` (my overrides; they beat everything else)
3. The phase prompt for the phase I'm on (for example `phase-1-schema-and-migrations.md`)
4. One of: `slice-1-plan.md` (after Phase 0) or `slice-1-handoff.md` (after a finished phase), plus any file I paste (for example the current `schema.prisma`)

Your job:
1. Read everything. List contradictions or gaps between the standard, my decisions, the phase prompt and the plan/handoff.
2. Challenge the approach honestly: anything that is risky, over-built, or missing for this phase only.
3. Ask me at most five questions, then wait.
4. After I answer, produce ONE file called `PHASE-N-SPEC.md` that Claude Code can build from without asking anything. It must contain: exact scope (what to build), explicit out-of-scope list, exact fields/signatures/screens as relevant, test cases, and a "Decisions" section listing every change I made so Claude Code can append them to `docs/slice-1-decisions.md`.
5. Keep it short and precise. No filler.

Never include secrets, connection strings or `.env` values in anything you produce.
