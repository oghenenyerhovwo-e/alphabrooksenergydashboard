/**
 * MAIN OPERATIONS — ARIA DAILY TEAM REPORT BUILDER (Phase 3, revised format)
 *
 * Consumes the deterministic Phase 2 data layer (lib/operations/team-data.ts)
 * and produces the short daily team report: subject, HTML body, and a
 * plain-text body. All facts (percentages, counts, overdue states, blocker
 * text) are computed here in plain code — the AI provider is only ever
 * asked to phrase already-computed facts naturally, never to calculate or
 * invent them. If AI generation fails, a fully deterministic fallback
 * covers every required section.
 *
 * REVISED FORMAT: the report is now two clearly separated sections —
 * (1) a narrative activity summary per person, with an explicit "no
 * activity" line for anyone who is truly idle (no completed AND no
 * in-progress tasks), followed by
 * (2) the percentage/count numbers per person plus the overall team
 * completion percentage.
 * Percentages never appear in Section 1, and activity descriptions never
 * appear in Section 2.
 *
 * Kept intentionally separate from lib/aria/report.ts / lib/aria/context.ts
 * (the CNG report) — no shared state, no shared prompt, no shared output
 * shape. Both can evolve independently.
 */

import type { OperationsTeamData, OperationsEmployeeSummary, OperationsConnectionStatus } from "@/types/operations";
import { generateAriaReply, AriaProviderError } from "./provider";

/** Caps so a large Planner plan can't blow up the AI prompt or the email. */
const MAX_TASK_TITLES_PER_EMPLOYEE = 6;
const MAX_BLOCKERS_PER_EMPLOYEE = 3;
const MAX_ATTENTION_ITEMS = 5;

/** Literal line used to visually separate Section 1 (activity) from Section 2 (numbers). */
const SECTION_SEPARATOR = "----------";

/* ============================================================
   STAGE 1 — Deterministic facts (Phase 2 data -> report facts)
   No AI, no formatting. Pure and testable in isolation.
   ============================================================ */

export interface OperationsReportEmployeeFacts {
  name: string;
  hasTasks: boolean;
  /**
   * True only when hasTasks is true AND the employee has zero completed
   * tasks AND zero in-progress tasks — i.e. every assigned task is still
   * "not-started". This is the trigger for the explicit "No activity to
   * report today." line. An employee with no tasks at all is a separate
   * case (hasTasks: false), not "idle".
   */
  isIdle: boolean;
  /** null only when hasTasks is false. */
  completionPercentage: number | null;
  completedTasks: number;
  totalTasks: number;
  overdueCount: number;
  /**
   * Titles of this employee's IN-PROGRESS tasks only (capped) — used for
   * the "worked on ..." activity clause. Not-started/pending task titles
   * are deliberately excluded here: a task nobody has touched yet is not
   * something the employee "worked on".
   */
  taskTitles: string[];
  /** Raw blocker text(s) from Planner Notes, capped. Empty = no blocker. */
  blockers: string[];
}

export interface OperationsReportFacts {
  /** e.g. "15 September 2026", computed in Africa/Lagos — never the server's local timezone. */
  reportDateLabel: string;
  connectionStatus: OperationsConnectionStatus;
  hasUsableData: boolean;
  employees: OperationsReportEmployeeFacts[];
  overallCompletionPercentage: number | null;
  totalUniqueTasks: number;
  completedUniqueTasks: number;
  /** Deterministic, application-generated attention bullets (blockers + overdue counts). Never AI-invented. */
  attentionItems: string[];
}

/** Africa/Lagos calendar date — explicit timezone, never assumes the server's local time. */
function getNigeriaReportDateLabel(now: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

function buildEmployeeFacts(employee: OperationsEmployeeSummary): OperationsReportEmployeeFacts {
  const inProgressTaskTitles = employee.tasks
    .filter((t) => t.status === "in-progress")
    .slice(0, MAX_TASK_TITLES_PER_EMPLOYEE)
    .map((t) => t.title);

  const isIdle =
    employee.totalTasks > 0 && employee.completedTasks === 0 && employee.inProgressTasks === 0;

  return {
    name: employee.name,
    hasTasks: employee.totalTasks > 0,
    isIdle,
    completionPercentage: employee.completionPercentage,
    completedTasks: employee.completedTasks,
    totalTasks: employee.totalTasks,
    overdueCount: employee.overdueTasks.length,
    taskTitles: inProgressTaskTitles,
    blockers: employee.blockers.slice(0, MAX_BLOCKERS_PER_EMPLOYEE).map((b) => b.text),
  };
}

/**
 * Deterministic attention bullets: every blocker gets its own item
 * (attributed to the employee/task that actually has it in Planner),
 * followed by a team-wide overdue summary if there is one. No severity
 * language, no invented urgency — just the facts, capped.
 */
function buildAttentionItems(data: OperationsTeamData): string[] {
  const items: string[] = [];

  for (const employee of data.employees) {
    for (const blocker of employee.blockers) {
      items.push(`${employee.name}: ${blocker.text} (task: ${blocker.taskTitle})`);
    }
  }

  const totalOverdue = data.employees.reduce((sum, e) => sum + e.overdueTasks.length, 0);
  if (totalOverdue > 0) {
    items.push(
      totalOverdue === 1
        ? "1 task across the team is currently overdue."
        : `${totalOverdue} tasks across the team are currently overdue.`
    );
  }

  return items.slice(0, MAX_ATTENTION_ITEMS);
}

export function buildOperationsReportFacts(
  data: OperationsTeamData,
  now: Date = new Date()
): OperationsReportFacts {
  return {
    reportDateLabel: getNigeriaReportDateLabel(now),
    connectionStatus: data.status,
    hasUsableData: data.status === "connected" && (data.employees.length > 0 || data.unassignedTasks.length > 0),
    employees: data.employees.map(buildEmployeeFacts),
    overallCompletionPercentage: data.overall.completionPercentage,
    totalUniqueTasks: data.overall.totalUniqueTasks,
    completedUniqueTasks: data.overall.completedUniqueTasks,
    attentionItems: buildAttentionItems(data),
  };
}

/* ============================================================
   STAGE 2a — AI natural-language formatting
   ============================================================ */

function buildReportSystemPrompt(facts: OperationsReportFacts): string {
  return `You are ARIA, the reporting assistant for Alpha Brooks Energy LTD. You are writing the body of a short internal morning email — the Main Operations Daily Team Work Report — addressed to the Managing Director ("Ma").

ABSOLUTE DATA RULE: Use only the supplied Planner facts below. Do not invent or calculate metrics. All percentages, counts, overdue states and blocker states are authoritative and must be reproduced exactly.

You may NOT: calculate completion percentages, determine whether a task is completed, determine overdue status, determine whether someone is idle, invent blockers, invent task assignments, invent employees, or invent any business activity, customer, amount, deadline, meeting, or outcome not present in REPORT_FACTS.

TONE: professional, concise, factual, confident, natural. No robotic phrasing, no corporate filler, no motivational language, no emojis, no long introductions.

FORMAT RULES (plain text only — no markdown symbols like ** or ##):

The report has exactly two sections, in this order. Never mix them: percentages and completed/total counts must NEVER appear in Section 1, and activity descriptions must NEVER appear in Section 2.

=== SECTION 1 — ACTIVITY ===
For each item in REPORT_FACTS.employees, in the order given, output exactly one block (no percentages, no counts):
- If hasTasks is false: one line, "<name>: No tasks assigned yet." Nothing else for that employee.
- Else if isIdle is true: start with "<name>: No activity to report today." Then, only if overdueCount is greater than 0, append a sentence stating the overdue count ("1 task overdue." or "<overdueCount> tasks overdue."). Then, only if blockers is non-empty, append one sentence starting with "Blocker: " that faithfully reproduces the blocker text(s) (light rewording for flow is fine; never change the meaning).
- Otherwise (has activity): start with "<name>: " followed by one short factual sentence naming what they worked on, paraphrased naturally from taskTitles only (never invent activity beyond those titles). If taskTitles is empty, instead write "<name>: Completed <completedTasks>/<totalTasks> tasks." Then, only if overdueCount is greater than 0, append a sentence stating the overdue count. Then, only if blockers is non-empty, append one sentence starting with "Blocker: " reproducing the blocker text(s). If overdueCount is 0 and blockers is empty, do not add filler like "No overdue tasks" or "No major blocker" — simply end the block after the activity sentence.
Leave one blank line between employee blocks.

After the last employee block, add a blank line, then a line containing exactly: ${SECTION_SEPARATOR}

=== SECTION 2 — NUMBERS ===
For each item in REPORT_FACTS.employees, in the same order, output exactly one line (no activity descriptions here):
- If hasTasks is false: "<name> — No tasks assigned yet."
- Otherwise: "<name> — <completionPercentage>% (<completedTasks>/<totalTasks>)"
No blank lines between these per-employee lines.

After the last employee line, add a blank line, then exactly one line:
"Overall team completion: <overallCompletionPercentage>%." — or, if overallCompletionPercentage is null, exactly "Overall team completion: Not available."

After that, add a blank line, then exactly one line starting with "Attention: " that naturally summarizes REPORT_FACTS.attentionItems in your own words, staying strictly factual to those items only. If attentionItems is empty, write exactly "Attention: No major issues reported."

Do not add a greeting, title, date, or sign-off — the system adds those separately.

REPORT_FACTS:
${JSON.stringify(facts)}`;
}

/* ============================================================
   STAGE 2b — Deterministic fallback (no AI)
   ============================================================ */

function formatEmployeeActivityFallback(emp: OperationsReportEmployeeFacts): string {
  if (!emp.hasTasks) {
    return `${emp.name}: No tasks assigned yet.`;
  }

  if (emp.isIdle) {
    const parts: string[] = [`${emp.name}: No activity to report today.`];
    if (emp.overdueCount > 0) {
      parts.push(emp.overdueCount === 1 ? "1 task overdue." : `${emp.overdueCount} tasks overdue.`);
    }
    if (emp.blockers.length > 0) {
      parts.push(`Blocker: ${emp.blockers.join("; ")}.`);
    }
    return parts.join(" ");
  }

  const parts: string[] = [
    emp.taskTitles.length > 0
      ? `${emp.name}: Worked on ${emp.taskTitles.join(", ")}.`
      : `${emp.name}: Completed ${emp.completedTasks}/${emp.totalTasks} tasks.`,
  ];
  if (emp.overdueCount > 0) {
    parts.push(emp.overdueCount === 1 ? "1 task overdue." : `${emp.overdueCount} tasks overdue.`);
  }
  if (emp.blockers.length > 0) {
    parts.push(`Blocker: ${emp.blockers.join("; ")}.`);
  }
  return parts.join(" ");
}

function formatEmployeeNumberFallback(emp: OperationsReportEmployeeFacts): string {
  if (!emp.hasTasks) {
    return `${emp.name} — No tasks assigned yet.`;
  }
  return `${emp.name} — ${emp.completionPercentage}% (${emp.completedTasks}/${emp.totalTasks})`;
}

export function buildFallbackReportText(facts: OperationsReportFacts): string {
  const activitySection = facts.employees.map(formatEmployeeActivityFallback).join("\n\n");
  const numbersSection = facts.employees.map(formatEmployeeNumberFallback).join("\n");

  const overallLine =
    facts.overallCompletionPercentage === null
      ? "Overall team completion: Not available."
      : `Overall team completion: ${facts.overallCompletionPercentage}%.`;

  const attentionLine =
    facts.attentionItems.length === 0
      ? "Attention: No major issues reported."
      : `Attention: ${facts.attentionItems.join(" ")}`;

  return [activitySection, SECTION_SEPARATOR, numbersSection, overallLine, attentionLine].join("\n\n");
}

/* ============================================================
   STAGE 3 — Narrative text -> email-safe HTML / plain text
   ============================================================ */

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Section 2 per-employee number lines, e.g. "John — 70% (7/10)" or "John — No tasks assigned yet." */
const NUMBER_LINE_PATTERN = /^.+ — (\d+%.*|No tasks assigned yet\.)$/;

/** Section 1 per-employee activity lines, e.g. "John: Worked on X." — captures the name before the colon. */
const ACTIVITY_LINE_PATTERN = /^(.+?): (.*)$/;

/**
 * No external CSS, no client-side JS, no React — plain <p> tags with
 * inline styles so the report renders reliably across email clients
 * (mirrors the reasoning already used for the CNG report's HTML).
 */
function narrativeToHtml(text: string): string {
  let html = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "") continue;

    if (line === SECTION_SEPARATOR) {
      html += `<hr style="border:none;border-top:1px solid #ccc;margin:14px 0;" />`;
      continue;
    }

    if (line.startsWith("Overall team completion:") || line.startsWith("Attention:")) {
      html += `<p style="margin:16px 0 4px 0;font-weight:bold;">${escapeHtml(line)}</p>`;
      continue;
    }

    if (NUMBER_LINE_PATTERN.test(line)) {
      html += `<p style="margin:2px 0;">${escapeHtml(line)}</p>`;
      continue;
    }

    const activityMatch = ACTIVITY_LINE_PATTERN.exec(line);
    if (activityMatch) {
      const [, name, rest] = activityMatch;
      html += `<p style="margin:0 0 2px 0;"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(rest)}</p>`;
      continue;
    }

    html += `<p style="margin:0 0 2px 0;">${escapeHtml(line)}</p>`;
  }

  return html;
}

function wrapReportHtml(reportDateLabel: string, narrativeHtml: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">
  <p style="margin:0 0 4px 0;">Good morning Ma.</p>
  <p style="margin:0 0 18px 0;font-weight:bold;font-size:16px;">Team Work Report — 7:00 AM, ${escapeHtml(reportDateLabel)}</p>
  ${narrativeHtml}
  <p style="margin:20px 0 0 0;">Regards,<br/>ARIA<br/>Alpha Brooks Energy LTD</p>
</div>`;
}

function wrapReportText(reportDateLabel: string, narrativeText: string): string {
  return [
    "Good morning Ma.",
    `Team Work Report — 7:00 AM, ${reportDateLabel}`,
    "",
    narrativeText,
    "",
    "Regards,",
    "ARIA",
    "Alpha Brooks Energy LTD",
  ].join("\n");
}

/* ============================================================
   PUBLIC ENTRY POINT
   ============================================================ */

export interface OperationsReportContent {
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export async function buildDailyOperationsReportContent(
  data: OperationsTeamData,
  now: Date = new Date()
): Promise<OperationsReportContent> {
  const facts = buildOperationsReportFacts(data, now);
  const subject = `Alpha Brooks Energy — Daily Team Work Report — ${facts.reportDateLabel}`;

  if (facts.connectionStatus !== "connected") {
    const narrative = "I could not access the latest Planner data when generating today's report.";
    return {
      subject,
      bodyHtml: wrapReportHtml(facts.reportDateLabel, narrativeToHtml(narrative)),
      bodyText: wrapReportText(facts.reportDateLabel, narrative),
    };
  }

  if (!facts.hasUsableData) {
    const narrative = "Planner is connected, but there are currently no Main Operations tasks recorded.";
    return {
      subject,
      bodyHtml: wrapReportHtml(facts.reportDateLabel, narrativeToHtml(narrative)),
      bodyText: wrapReportText(facts.reportDateLabel, narrative),
    };
  }

  let narrative: string;
  try {
    narrative = await generateAriaReply(
      buildReportSystemPrompt(facts),
      [],
      "Generate today's Main Operations Daily Team Work Report now, following the required format exactly."
    );
  } catch (e) {
    console.error(
      "[Operations Report] AI generation failed, using deterministic fallback:",
      e instanceof AriaProviderError ? e.message : e
    );
    narrative = buildFallbackReportText(facts);
  }

  return {
    subject,
    bodyHtml: wrapReportHtml(facts.reportDateLabel, narrativeToHtml(narrative)),
    bodyText: wrapReportText(facts.reportDateLabel, narrative),
  };
}