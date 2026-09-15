/**
 * MAIN OPERATIONS — ARIA DAILY TEAM REPORT BUILDER (Phase 3)
 *
 * Consumes the deterministic Phase 2 data layer (lib/operations/team-data.ts)
 * and produces the short daily team report: subject, HTML body, and a
 * plain-text body. All facts (percentages, counts, overdue states, blocker
 * text) are computed here in plain code — the AI provider is only ever
 * asked to phrase already-computed facts naturally, never to calculate or
 * invent them. If AI generation fails, a fully deterministic fallback
 * covers every required section.
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

/* ============================================================
   STAGE 1 — Deterministic facts (Phase 2 data -> report facts)
   No AI, no formatting. Pure and testable in isolation.
   ============================================================ */

export interface OperationsReportEmployeeFacts {
  name: string;
  hasTasks: boolean;
  /** null only when hasTasks is false. */
  completionPercentage: number | null;
  completedTasks: number;
  totalTasks: number;
  overdueCount: number;
  /** Titles of this employee's not-yet-completed tasks, capped, for the AI/fallback to describe "worked on". */
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
  const activeTaskTitles = employee.tasks
    .filter((t) => t.status !== "completed")
    .slice(0, MAX_TASK_TITLES_PER_EMPLOYEE)
    .map((t) => t.title);

  return {
    name: employee.name,
    hasTasks: employee.totalTasks > 0,
    completionPercentage: employee.completionPercentage,
    completedTasks: employee.completedTasks,
    totalTasks: employee.totalTasks,
    overdueCount: employee.overdueTasks.length,
    taskTitles: activeTaskTitles,
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

You may NOT: calculate completion percentages, determine whether a task is completed, determine overdue status, invent blockers, invent task assignments, invent employees, or invent any business activity, customer, amount, deadline, meeting, or outcome not present in REPORT_FACTS.

TONE: professional, concise, factual, confident, natural. No robotic phrasing, no corporate filler, no motivational language, no emojis, no long introductions.

FORMAT RULES (plain text only — no markdown symbols like ** or ##):

For each item in REPORT_FACTS.employees, in the order given, output a block:
- If hasTasks is false: one line, "<name> — No tasks assigned yet." Nothing else for that employee.
- Otherwise:
  Line 1: "<name> — <completionPercentage>%"
  Line 2: If completedTasks equals totalTasks, write "Completed all assigned tasks." Otherwise write "Completed <completedTasks>/<totalTasks> tasks." optionally followed by one short factual clause naming what they worked on, paraphrased naturally from taskTitles only (never invent activity beyond those titles; omit this clause if taskTitles is empty).
  Line 3: If overdueCount is 0, write "No overdue tasks." If it is 1, write "1 task overdue." Otherwise write "<overdueCount> tasks overdue."
  Line 4: If blockers is empty, write "No major blocker." Otherwise write one sentence starting with "Blocker: " that faithfully reproduces the blocker text(s) (light rewording for flow is fine; never change the meaning).
Leave one blank line between employee blocks.

After all employee blocks, add a blank line, then exactly one line:
"Overall team completion: <overallCompletionPercentage>%." — or, if overallCompletionPercentage is null, exactly "Overall team completion: Not available."

After that, add a blank line, then exactly one line starting with "Attention: " that naturally summarizes REPORT_FACTS.attentionItems in your own words, staying strictly factual to those items only. If attentionItems is empty, write exactly "Attention: No major issues reported."

Do not add a greeting, title, date, or sign-off — the system adds those separately.

REPORT_FACTS:
${JSON.stringify(facts)}`;
}

/* ============================================================
   STAGE 2b — Deterministic fallback (no AI)
   ============================================================ */

function formatEmployeeFallback(emp: OperationsReportEmployeeFacts): string {
  if (!emp.hasTasks) {
    return `${emp.name} — No tasks assigned yet.`;
  }

  const lines: string[] = [`${emp.name} — ${emp.completionPercentage}%`];

  if (emp.completedTasks === emp.totalTasks) {
    lines.push("Completed all assigned tasks.");
  } else if (emp.taskTitles.length > 0) {
    lines.push(`Completed ${emp.completedTasks}/${emp.totalTasks} tasks. Worked on ${emp.taskTitles.join(", ")}.`);
  } else {
    lines.push(`Completed ${emp.completedTasks}/${emp.totalTasks} tasks.`);
  }

  lines.push(
    emp.overdueCount === 0
      ? "No overdue tasks."
      : emp.overdueCount === 1
      ? "1 task overdue."
      : `${emp.overdueCount} tasks overdue.`
  );

  lines.push(emp.blockers.length === 0 ? "No major blocker." : `Blocker: ${emp.blockers.join("; ")}.`);

  return lines.join("\n");
}

export function buildFallbackReportText(facts: OperationsReportFacts): string {
  const blocks = facts.employees.map(formatEmployeeFallback);

  const overallLine =
    facts.overallCompletionPercentage === null
      ? "Overall team completion: Not available."
      : `Overall team completion: ${facts.overallCompletionPercentage}%.`;

  const attentionLine =
    facts.attentionItems.length === 0
      ? "Attention: No major issues reported."
      : `Attention: ${facts.attentionItems.join(" ")}`;

  return [...blocks, overallLine, attentionLine].join("\n\n");
}

/* ============================================================
   STAGE 3 — Narrative text -> email-safe HTML / plain text
   ============================================================ */

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const EMPLOYEE_HEADING_PATTERN = /^.+ — (\d+%|No tasks assigned yet\.)$/;

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

    if (EMPLOYEE_HEADING_PATTERN.test(line)) {
      html += `<p style="margin:16px 0 2px 0;font-weight:bold;">${escapeHtml(line)}</p>`;
    } else if (line.startsWith("Overall team completion:") || line.startsWith("Attention:")) {
      html += `<p style="margin:16px 0 4px 0;font-weight:bold;">${escapeHtml(line)}</p>`;
    } else {
      html += `<p style="margin:0 0 2px 0;">${escapeHtml(line)}</p>`;
    }
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