import type { AriaBusinessContext } from "./context";
import { generateAriaReply, AriaProviderError } from "./provider";

export interface AriaReportContent {
  subject: string;
  bodyHtml: string;
}

/** Headers we told the AI (and the fallback) to use exactly. Anything matching
 * one of these, on its own line, is rendered as a bold section heading. */
const SECTION_HEADERS = [
  "COMPLETED",
  "IN PROGRESS",
  "PENDING",
  "OVERDUE / ATTENTION REQUIRED",
  "UPCOMING",
  "KEY MANAGEMENT NOTES",
  "NEXT CRITICAL ACTIONS",
];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Converts plain-text report content into real HTML elements (<p>, <ul><li>,
 * <ol><li>) rather than relying on CSS whitespace handling — Outlook's Word
 * rendering engine ignores `white-space: pre-wrap` entirely, so actual
 * elements are the only reliable way to preserve structure across clients.
 */
function narrativeToHtml(text: string): string {
  const lines = text.split("\n");
  let html = "";
  let mode: "none" | "ul" | "ol" = "none";

  const closeList = () => {
    if (mode === "ul") html += "</ul>";
    if (mode === "ol") html += "</ol>";
    mode = "none";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "") {
      closeList();
      continue;
    }

    const bulletMatch = line.match(/^[•\-]\s+(.*)/);
    const numberedMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch) {
      if (mode !== "ul") {
        closeList();
        html += '<ul style="margin:4px 0 14px 20px;padding:0;">';
        mode = "ul";
      }
      html += `<li style="margin-bottom:4px;">${escapeHtml(bulletMatch[1])}</li>`;
    } else if (numberedMatch) {
      if (mode !== "ol") {
        closeList();
        html += '<ol style="margin:4px 0 14px 20px;padding:0;">';
        mode = "ol";
      }
      html += `<li style="margin-bottom:4px;">${escapeHtml(numberedMatch[1])}</li>`;
    } else if (SECTION_HEADERS.includes(line)) {
      closeList();
      html += `<p style="margin:18px 0 4px 0;font-weight:bold;">${escapeHtml(line)}</p>`;
    } else {
      closeList();
      html += `<p style="margin:4px 0;">${escapeHtml(line)}</p>`;
    }
  }
  closeList();
  return html;
}

function wrapReportHtml(titleLine: string, dateLine: string, progressLine: string, narrativeHtml: string): string {
  return `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">
  <p style="margin:0 0 4px 0;font-weight:bold;font-size:16px;">${escapeHtml(titleLine)}</p>
  <p style="margin:0 0 14px 0;">${escapeHtml(dateLine)}</p>
  <p style="margin:0 0 4px 0;font-weight:bold;">PROJECT STATUS</p>
  <p style="margin:0 0 14px 0;">${escapeHtml(progressLine)}</p>
  ${narrativeHtml}
  <p style="margin:20px 0 0 0;">Regards,<br/>ARIA<br/>Alpha Brooks Real-time Intelligence Assistant<br/>Alpha Brooks Energy LTD</p>
</div>`;
}

function formatProgress(pct: number | null): string {
  return pct === null ? "Not available" : `${pct}%`;
}

function buildReportSystemPrompt(context: AriaBusinessContext): string {
  return `You are ARIA — Alpha Brooks Real-time Intelligence Assistant. You are writing the body of an internal daily management email for Alpha Brooks Energy LTD's CNG project, addressed to the Managing Director.

ABSOLUTE DATA RULE: use only facts present in CNG_DATA below. Never invent tasks, names, dates, or numbers. If a section has nothing to report, write "Nothing to report today" under that heading rather than inventing content.

FORMAT RULES:
- Plain text only. Do NOT use markdown symbols like **, ##, or backticks.
- Write EXACTLY these section headers, in capital letters, each on its own line, in this order:
COMPLETED
IN PROGRESS
PENDING
OVERDUE / ATTENTION REQUIRED
UPCOMING
KEY MANAGEMENT NOTES
NEXT CRITICAL ACTIONS
- Under each header, use short bullet lines starting with "• ".
- Under NEXT CRITICAL ACTIONS, use a numbered list (1., 2., 3.) instead of bullets.
- Do NOT write a title, date, greeting, sign-off, or overall progress percentage — those are added separately by the system.
- Be concise: management should be able to read this in 1-2 minutes.

CNG_DATA:
${JSON.stringify(context)}`;
}

function buildFallbackReportText(context: AriaBusinessContext): string {
  const lines: string[] = [];
  lines.push("COMPLETED");
  lines.push(`• ${context.overview.completedTasks} task(s) completed to date.`);
  lines.push("IN PROGRESS");
  lines.push(`• ${context.overview.inProgressTasks} task(s) currently in progress.`);
  lines.push("PENDING");
  lines.push(`• ${context.overview.notStartedTasks} task(s) not yet started.`);
  lines.push("OVERDUE / ATTENTION REQUIRED");
  lines.push(`• ${context.overview.overdueCount} task(s) overdue. ${context.attention.criticalCount} critical attention signal(s).`);
  lines.push("UPCOMING");
  lines.push(`• ${context.deadlines.dueSoonCount} task(s) due soon, ${context.deadlines.dueTodayCount} due today.`);
  lines.push("KEY MANAGEMENT NOTES");
  lines.push("• The AI summary service was unavailable when this report was generated, so this is a plain figures fallback.");
  lines.push("NEXT CRITICAL ACTIONS");
  lines.push("1. Review the dashboard directly for full detail while the AI summary is unavailable.");
  return lines.join("\n");
}

export async function buildDailyReportContent(context: AriaBusinessContext): Promise<AriaReportContent> {
  const reportDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const subject = `CNG Operations — Daily Management Report — ${reportDate}`;
  const titleLine = "CNG OPERATIONS — DAILY MANAGEMENT REPORT";

  if (context.connectionStatus !== "connected") {
    return {
      subject,
      bodyHtml: wrapReportHtml(titleLine, reportDate, "Not available", narrativeToHtml("I could not access the latest Planner data when generating today's report.")),
    };
  }

  if (!context.hasUsableData) {
    return {
      subject,
      bodyHtml: wrapReportHtml(titleLine, reportDate, "Not available", narrativeToHtml("Planner is connected, but there are currently no CNG tasks recorded.")),
    };
  }

  let narrative: string;
  try {
    narrative = await generateAriaReply(
      buildReportSystemPrompt(context),
      [],
      "Generate today's CNG Operations daily management report now, following the required section format exactly."
    );
  } catch (e) {
    console.error("[ARIA Report] AI generation failed, using deterministic fallback:", e instanceof AriaProviderError ? e.message : e);
    narrative = buildFallbackReportText(context);
  }

  return {
    subject,
    bodyHtml: wrapReportHtml(titleLine, reportDate, formatProgress(context.overview.overallProgressPercentage), narrativeToHtml(narrative)),
  };
}