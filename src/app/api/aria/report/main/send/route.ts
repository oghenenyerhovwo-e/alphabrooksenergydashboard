import { NextResponse } from "next/server";
import { getOperationsTeamData } from "@/lib/operations/team-data";
import { buildDailyOperationsReportContent } from "@/lib/aria/operations-report";
import { sendAriaMail, CngMailConfigError, CngMailApiError } from "@/lib/graph/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Main Operations Daily Team Report sender. Deliberately a separate route
 * from the existing /api/aria/report/send (CNG) — same auth conventions,
 * same mail sender, entirely separate data source and content.
 *
 * The historical snapshot is captured separately, late at night, by
 * /api/operations/reports/capture — this route only sends the morning
 * email and no longer writes to the archive.
 */
async function sendDailyOperationsReport(): Promise<{ status: number; body: Record<string, unknown> }> {
  const recipientEnv = process.env.ARIA_OPS_MD_EMAIL || process.env.ARIA_MD_EMAIL;
  if (!recipientEnv) {
    return {
      status: 500,
      body: { error: "Missing required configuration: set ARIA_OPS_MD_EMAIL (or ARIA_MD_EMAIL as a shared fallback)." },
    };
  }
  const recipient = recipientEnv.split(",").map((address) => address.trim()).filter(Boolean);

  console.log("[Operations Report] generation started");
  const data = await getOperationsTeamData();
  console.log(
    `[Operations Report] Planner data status=${data.status} uniqueTasks=${data.overall.totalUniqueTasks} employees=${data.employees.length}`
  );

  try {
    const { subject, bodyHtml } = await buildDailyOperationsReportContent(data);
    console.log("[Operations Report] generation completed, sending email");
    await sendAriaMail({ to: recipient, subject, bodyHtml });
    console.log("[Operations Report] email send succeeded");
    return {
      status: 200,
      body: {
        sent: true,
        connectionStatus: data.status,
      },
    };
  } catch (e) {
    if (e instanceof CngMailConfigError) {
      console.error("[Operations Report] email send failed (config):", e.message);
      return { status: 500, body: { error: e.message } };
    }
    if (e instanceof CngMailApiError) {
      console.error("[Operations Report] email send failed (Graph):", e.message);
      return { status: 502, body: { error: e.message } };
    }
    console.error("[Operations Report] unexpected error:", e);
    return { status: 500, body: { error: "Unexpected error sending the report." } };
  }
}

/** Vercel Cron calls this at 06:00 UTC / 07:00 Africa/Lagos, Mon–Fri (see vercel.json). */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { status, body } = await sendDailyOperationsReport();
  return NextResponse.json(body, { status });
}

/** For your own manual testing — same convention as the existing CNG report route. */
export async function POST(req: Request) {
  const token = req.headers.get("x-aria-internal-token");
  if (!token || token !== process.env.ARIA_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { status, body } = await sendDailyOperationsReport();
  return NextResponse.json(body, { status });
}