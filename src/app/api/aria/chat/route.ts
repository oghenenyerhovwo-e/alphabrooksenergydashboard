import { NextResponse } from "next/server";
import { fetchCngPlannerData, CngGraphApiError } from "@/lib/graph/planner";
import { normalizeCngData, CngNormalizationError } from "@/lib/cng/normalize";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";
import { buildAriaContext, type AriaBusinessContext } from "@/lib/aria/context";
import { generateAriaReply, AriaProviderError, type AriaChatMessage } from "@/lib/aria/provider";
import type { CngData } from "@/types/cng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 8;

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
  const history = (body.history ?? []).slice(-MAX_HISTORY_MESSAGES);

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