import { NextResponse } from "next/server";
import { fetchCngPlannerData, CngGraphApiError } from "@/lib/graph/planner";
import { normalizeCngData, CngNormalizationError } from "@/lib/cng/normalize";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";
import {
  buildAriaContext,
  buildOperationsAriaContext,
  type AriaBusinessContext,
  type AriaOperationsContext,
} from "@/lib/aria/context";
import { generateAriaReply, AriaProviderError, type AriaChatMessage } from "@/lib/aria/provider";
import { getOperationsTeamData } from "@/lib/operations/team-data";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/auth/origin";
import type { CngData } from "@/types/cng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 4000;

/**
 * Best-effort, per-instance rate limit — NOT a distributed guarantee.
 * Vercel serverless functions don't share memory across instances, so
 * under real concurrent load this only throttles requests that happen to
 * land on the same warm instance. It's a cheap deterrent against a single
 * runaway client, not a hard cap. If ARIA chat abuse becomes a real cost
 * problem, the fix is a shared store (e.g. Upstash Redis) — a new
 * dependency, so that's a call for you, not something to add silently.
 */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestLog = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  requestLog.set(userId, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

/**
 * ARIA now covers two independent business areas: Main Operations (Planner
 * team-task tracking, added Phase 5) and CNG (project phases/buckets,
 * pre-existing). Both authoritative data blocks are always supplied;
 * no question classifier decides which one to fetch — that would mean
 * guessing before knowing what the user actually asked. The model reads
 * the question and picks the right block, but every number it states
 * must come from one of the two JSON blocks below, never be invented or
 * recomputed.
 */
function buildSystemPrompt(
  operationsContext: AriaOperationsContext,
  cngContext: AriaBusinessContext
): string {
  return `You are ARIA — Alpha Brooks Real-time Intelligence Assistant, the internal AI operations assistant for Alpha Brooks Energy LTD.

You cover two separate business areas, each with its own authoritative data block below. Never mix numbers between them and never use one area's data to answer a question about the other.

1. MAIN OPERATIONS (OPERATIONS_DATA) — day-to-day team task tracking sourced from Microsoft Planner: employee completion percentages, task counts, overdue tasks, blockers. This is the DEFAULT area — answer here unless the question clearly names CNG, the CNG project, CNG phases, CNG buckets, or CNG readiness.
2. CNG (CNG_DATA) — the CNG project's phase/bucket/readiness tracking. Use this only when the question is clearly about the CNG project specifically.

PERSONALITY: professional, concise, intelligent, calm, management-oriented. No consumer-chatbot fluff. Keep answers short — 1 to 5 lines for a simple question, bullets for a list. When relevant, prioritize: what is happening, why it matters, what needs attention, what should happen next.

ABSOLUTE DATA RULE: state only facts present in OPERATIONS_DATA or CNG_DATA below, whichever applies to the question. Never invent employees, tasks, dates, percentages, blockers, deadlines, or business results that are not in the supplied data. All percentages and counts below are already correctly calculated by application code — reproduce them exactly. Never recompute, round, or hedge them (a value of 40 is "40%", never "roughly 40%" or "about 40%").

An employee with completionPercentage: null has no tasks assigned — say "No tasks assigned yet." for them, and never treat them as 0% or as the lowest performer.
A blocker exists only if it appears in that employee's "blockers" list — never infer a blocker from an ordinary task title, an "UPDATE:" note, or a "NEXT:" note.
If the user asks about an employee name that does not appear in OPERATIONS_DATA.employees, say plainly that you couldn't find that employee in the current Planner data — do not guess who they might mean.
If multiple employees are tied for the lowest (or highest) completion percentage, name all of them.

MAIN OPERATIONS CONNECTION STATE: connectionStatus = "${operationsContext.connectionStatus}", hasUsableData = ${operationsContext.hasUsableData}.
- If connectionStatus is not "connected": tell the user you can't retrieve current Main Operations Planner data right now, so you can't give a reliable live work-status answer. Do not fabricate one.
- If connected but hasUsableData is false: tell the user Planner is connected but there are currently no Main Operations tasks recorded.

CNG CONNECTION STATE: connectionStatus = "${cngContext.connectionStatus}", hasUsableData = ${cngContext.hasUsableData}.
- Same rule: if not connected, or connected with no usable data, say so plainly rather than guessing.

OPERATIONS_DATA:
${JSON.stringify(operationsContext)}

CNG_DATA:
${JSON.stringify(cngContext)}`;
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(currentUser.id)) {
    return NextResponse.json(
      { error: "Too many messages in a short time. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: { message?: string; history?: AriaChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` },
      { status: 400 }
    );
  }
  const history = (Array.isArray(body.history) ? body.history : []).slice(-MAX_HISTORY_MESSAGES);

  // Both domains are fetched on every question, in parallel — a single
  // Graph round trip per domain, not one per sentence of the eventual
  // answer. getOperationsTeamData() never throws; it returns a
  // connection-status-annotated result on failure, same convention as
  // the CNG fetch below.
  const [cngData, operationsTeamData] = await Promise.all([
    (async (): Promise<CngData> => {
      try {
        const raw = await fetchCngPlannerData();
        const normalized = normalizeCngData(raw);
        return {
          tasks: normalized.tasks,
          buckets: normalized.buckets,
          users: normalized.users,
          lastUpdated: new Date().toISOString(),
          status: "connected",
        };
      } catch (e) {
        const status =
          e instanceof CngConfigError
            ? "not_connected"
            : e instanceof CngAuthError || e instanceof CngGraphApiError || e instanceof CngNormalizationError
              ? "error"
              : "error";
        return { tasks: [], buckets: [], users: [], lastUpdated: null, status };
      }
    })(),
    getOperationsTeamData(),
  ]);

  const cngContext = buildAriaContext(
    cngData.tasks,
    cngData.buckets,
    cngData.users,
    cngData.status,
    cngData.lastUpdated
  );
  const operationsContext = buildOperationsAriaContext(operationsTeamData);

  try {
    const reply = await generateAriaReply(
      buildSystemPrompt(operationsContext, cngContext),
      history,
      message
    );
    return NextResponse.json({ reply });
  } catch (e) {
    if (e instanceof AriaProviderError) {
      return NextResponse.json({ reply: `I'm temporarily unable to reach the AI service (${e.message}). The rest of the dashboard is unaffected.` });
    }
    console.error("[ARIA Chat] unexpected error:", e);
    return NextResponse.json({ reply: "Something went wrong answering that. Please try again." });
  }
}