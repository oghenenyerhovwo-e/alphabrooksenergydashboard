import { NextResponse } from "next/server";
import { fetchCngPlannerData, CngGraphApiError } from "@/lib/graph/planner";
import { normalizeCngData, CngNormalizationError } from "@/lib/cng/normalize";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";
import { buildAriaContext } from "@/lib/aria/context";
import { buildDailyReportContent } from "@/lib/aria/report";
import { sendAriaMail, CngMailConfigError, CngMailApiError } from "@/lib/graph/mail";
import type { CngData } from "@/types/cng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sendDailyReport(): Promise<{ status: number; body: Record<string, unknown> }> {
  // Testing override: when ARIA_REPORT_TEST_RECIPIENT is set, send there instead
  // of the real recipients. Remove/unset this env var before going live.
  // ARIA_MD_EMAIL supports a comma-separated list, e.g. for CC'ing yourself.
  const recipientEnv =  process.env.ARIA_MD_EMAIL;
  if (!recipientEnv) {
    return { status: 500, body: { error: "Missing required configuration: ARIA_MD_EMAIL." } };
  }
  const recipient = recipientEnv.split(",").map((address) => address.trim()).filter(Boolean);

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

  const context = buildAriaContext(cngData.tasks, cngData.buckets, cngData.users, cngData.status, cngData.lastUpdated);

  try {
    const { subject, bodyHtml } = await buildDailyReportContent(context);
    await sendAriaMail({ to: recipient, subject, bodyHtml });
    return { status: 200, body: { sent: true, connectionStatus: context.connectionStatus } };
  } catch (e) {
    if (e instanceof CngMailConfigError) {
      return { status: 500, body: { error: e.message } };
    }
    if (e instanceof CngMailApiError) {
      return { status: 502, body: { error: e.message } };
    }
    console.error("[ARIA report/send] unexpected error:", e);
    return { status: 500, body: { error: "Unexpected error sending the report." } };
  }
}

/** Vercel Cron calls this automatically, Mon–Fri, per vercel.json. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { status, body } = await sendDailyReport();
  return NextResponse.json(body, { status });
}

/** Kept for your own manual PowerShell testing, same as before. */
export async function POST(req: Request) {
  const token = req.headers.get("x-aria-internal-token");
  if (!token || token !== process.env.ARIA_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { status, body } = await sendDailyReport();
  return NextResponse.json(body, { status });
}