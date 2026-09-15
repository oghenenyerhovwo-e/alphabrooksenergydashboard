import { NextResponse } from "next/server";
import { getTeamIntroContent } from "@/lib/aria/team-intro";
import { sendAriaMail, CngMailConfigError, CngMailApiError } from "@/lib/graph/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MAIN OPERATIONS — ARIA ONE-TIME TEAM INTRODUCTION (Phase 4, Goal B)
 *
 * Deliberately POST-only, manual-trigger-only. NOT wired into vercel.json
 * and must never be — this is a separate operation from the daily report
 * cron (/api/aria/report/main/send), per the Phase 4 spec's "CRITICAL
 * DISTINCTION" section.
 *
 * ONE-TIME GATE — READ BEFORE USE:
 * This project has no settings table, config table, or KV store, and the
 * Phase 4 spec explicitly forbids adding a database table solely to
 * remember whether this message was sent. The smallest mechanism
 * consistent with how the rest of this app is already configured
 * (env-var-driven) is: ARIA_TEAM_INTRO_SENT.
 *
 * This is NOT a runtime variable (`let sent = false`) — those reset on
 * every cold start, which the spec explicitly flags as unacceptable. An
 * env var is read from the deployment's configuration on every
 * invocation, so it survives restarts and redeploys.
 *
 * MANUAL STEP REQUIRED: after this route successfully sends the message,
 * set ARIA_TEAM_INTRO_SENT=true in your environment (and restart the dev
 * server locally, or redeploy on Vercel). Until you do that, calling this
 * endpoint again WILL send the message again. The success response below
 * reminds you of this every time.
 */
async function sendTeamIntro(): Promise<{ status: number; body: Record<string, unknown> }> {
  const alreadySent = process.env.ARIA_TEAM_INTRO_SENT === "true";
  if (alreadySent) {
    return {
      status: 200,
      body: { sent: false, skipped: true, reason: "ARIA_TEAM_INTRO_SENT is already set to true." },
    };
  }

  const recipientEnv = process.env.ARIA_TEAM_RECIPIENTS;
  if (!recipientEnv) {
    return {
      status: 500,
      body: {
        error:
          "Missing required configuration: set ARIA_TEAM_RECIPIENTS (comma-separated team email addresses).",
      },
    };
  }
  const recipients = recipientEnv.split(",").map((address) => address.trim()).filter(Boolean);
  if (recipients.length === 0) {
    return { status: 500, body: { error: "ARIA_TEAM_RECIPIENTS is set but contains no valid addresses." } };
  }

  const { subject, bodyHtml } = getTeamIntroContent();

  try {
    await sendAriaMail({ to: recipients, subject, bodyHtml });
    console.log(`[Team Intro] sent to ${recipients.length} recipient(s)`);
    return {
      status: 200,
      body: {
        sent: true,
        recipientCount: recipients.length,
        action_required:
          "Set ARIA_TEAM_INTRO_SENT=true in your environment now (and restart/redeploy) so this never sends again.",
      },
    };
  } catch (e) {
    if (e instanceof CngMailConfigError) {
      console.error("[Team Intro] send failed (config):", e.message);
      return { status: 500, body: { error: e.message } };
    }
    if (e instanceof CngMailApiError) {
      console.error("[Team Intro] send failed (Graph):", e.message);
      return { status: 502, body: { error: e.message } };
    }
    console.error("[Team Intro] unexpected error:", e);
    return { status: 500, body: { error: "Unexpected error sending the team introduction message." } };
  }
}

/**
 * Manual trigger only — same auth convention as the other manually-tested
 * ARIA routes. Deliberately no GET/cron handler: this must never run on a
 * schedule.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-aria-internal-token");
  if (!token || token !== process.env.ARIA_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { status, body } = await sendTeamIntro();
  return NextResponse.json(body, { status });
}