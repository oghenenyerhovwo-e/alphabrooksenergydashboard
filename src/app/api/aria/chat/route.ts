import { NextResponse } from "next/server";
import { fetchCngPlannerData, CngGraphApiError } from "@/lib/graph/planner";
import { normalizeCngData, CngNormalizationError } from "@/lib/cng/normalize";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";
import { buildAriaContext, type AriaBusinessContext } from "@/lib/aria/context";
import { generateAriaReply, AriaProviderError, type AriaChatMessage } from "@/lib/aria/provider";
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

function buildSystemPrompt(context: AriaBusinessContext): string {
  return `You are ARIA — Alpha Brooks Real-time Intelligence Assistant, the internal AI operations assistant for Alpha Brooks Energy LTD's CNG project.

PERSONALITY: professional, concise, intelligent, calm, management-oriented. No consumer-chatbot fluff. When relevant, prioritize: what is happening, why it matters, what needs attention, what should happen next.

ABSOLUTE DATA RULE: you may only state facts present in the CNG_DATA JSON below. Never invent tasks, employees, dates, percentages, or status. If something isn't in the data, say plainly that it isn't available — do not guess or approximate.

CONNECTION STATE: connectionStatus = "${context.connectionStatus}", hasUsableData = ${context.hasUsableData}.
- If connectionStatus is not "connected": tell the user you can't access the latest Planner data right now.
- If connected but hasUsableData is false: tell the user Planner is connected but there are currently no CNG tasks available.

Numbers in CNG_DATA are already correctly calculated — never recompute or contradict them. Explain and prioritize; don't do arithmetic yourself.

CNG_DATA:
${JSON.stringify(context)}`;
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

  let cngData: CngData;
  try {
    const raw = await fetchCngPlannerData();
    const normalized = normalizeCngData(raw);
    cngData = {
      tasks: normalized.tasks,
      buckets: normalized.buckets,
      users: normalized.users,
      lastUpdated: new Date().toISOString(),
      status: "connected",
    };
  } catch (e) {
    const status =
      e instanceof CngConfigError ? "not_connected" : e instanceof CngAuthError || e instanceof CngGraphApiError || e instanceof CngNormalizationError ? "error" : "error";
    cngData = { tasks: [], buckets: [], users: [], lastUpdated: null, status };
  }

  const context = buildAriaContext(
    cngData.tasks,
    cngData.buckets,
    cngData.users,
    cngData.status,
    cngData.lastUpdated
  );

  try {
    const reply = await generateAriaReply(buildSystemPrompt(context), history, message);
    return NextResponse.json({ reply });
  } catch (e) {
    if (e instanceof AriaProviderError) {
      return NextResponse.json({ reply: `I'm temporarily unable to reach the AI service (${e.message}). The rest of the dashboard is unaffected.` });
    }
    console.error("[ARIA Chat] unexpected error:", e);
    return NextResponse.json({ reply: "Something went wrong answering that. Please try again." });
  }
}