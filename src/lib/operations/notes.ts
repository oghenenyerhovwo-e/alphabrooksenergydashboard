/**
 * MAIN OPERATIONS — PLANNER NOTES PARSING (Phase 6)
 *
 * Deterministic, plain-code parsing of the Planner task
 * Notes/Description field. No AI is involved in deciding whether a
 * blocker exists or what a section contains.
 *
 * `extractBlockers` was moved here from lib/operations/team-data.ts
 * unchanged — same regex, same semantics — and is re-exported from
 * team-data.ts so every existing import keeps working.
 */

import type { OperationsTaskNoteSections } from "@/types/operations";

/**
 * A blocker is any line whose trimmed text starts with "BLOCKER:"
 * (case-insensitive). Everything after the prefix, trimmed, is the
 * blocker text. "UPDATE:" and "NEXT:" are never blockers.
 */
const BLOCKER_PREFIX = /^blocker:\s*/i;

/** A section header line: "UPDATE:", "BLOCKER:", "NEXT:" — optionally with content on the same line. */
const SECTION_HEADER = /^(update|blocker|next)\s*:\s*(.*)$/i;

export function extractBlockers(notes: string | null | undefined): string[] {
  if (!notes) return [];

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => BLOCKER_PREFIX.test(line))
    .map((line) => line.replace(BLOCKER_PREFIX, "").trim())
    .filter((text) => text.length > 0);
}

/**
 * Splits the Notes into its UPDATE / BLOCKER / NEXT sections.
 *
 * A header line opens a section; every following line belongs to that
 * section until the next header. Blank lines are preserved as paragraph
 * breaks within a section rather than terminating it, so a multi-line
 * UPDATE survives intact. Text appearing BEFORE the first header
 * belongs to no section — it is not lost, it simply remains available
 * in the raw `notes` string, which is always stored in full.
 *
 * Returns null for any section that is absent or empty. Nothing is ever
 * invented for a missing section.
 */
export function parseNoteSections(notes: string | null | undefined): OperationsTaskNoteSections {
  const empty: OperationsTaskNoteSections = { update: null, blocker: null, next: null };
  if (!notes) return empty;

  const collected: Record<"update" | "blocker" | "next", string[]> = {
    update: [],
    blocker: [],
    next: [],
  };

  let current: "update" | "blocker" | "next" | null = null;

  for (const rawLine of notes.split("\n")) {
    const line = rawLine.trim();
    const header = SECTION_HEADER.exec(line);

    if (header) {
      current = header[1].toLowerCase() as "update" | "blocker" | "next";
      const inline = header[2].trim();
      if (inline) collected[current].push(inline);
      continue;
    }

    if (current === null) continue;

    // Keep blank lines only between content, never leading.
    if (line === "" && collected[current].length === 0) continue;

    collected[current].push(line);
  }

  const finalize = (lines: string[]): string | null => {
    const text = lines.join("\n").trim();
    return text.length > 0 ? text : null;
  };

  return {
    update: finalize(collected.update),
    blocker: finalize(collected.blocker),
    next: finalize(collected.next),
  };
}