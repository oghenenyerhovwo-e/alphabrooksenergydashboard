import { NextResponse } from "next/server";

import {
  sendAriaMail,
  CngMailConfigError,
  CngMailApiError,
} from "@/lib/graph/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ARIA — WEEKLY WORK PLAN EMAIL
 *
 * Every Monday at 8:00 AM Nigeria time:
 *
 * Each staff member receives their own individual email.
 *
 * The Boss and IT Head are copied on every email.
 *
 * This route ONLY sends the weekly request email.
 *
 * It does NOT handle:
 * - database submissions
 * - open/closed submission status
 * - deadline enforcement
 * - Planner tasks
 * - weekly report calculations
 */

function getEmailList(
  value: string | undefined
): string[] {
  return (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getRequiredEmail(
  environmentVariable: string | undefined,
  variableName: string
): string {
  const email =
    environmentVariable?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      `${variableName} is not configured.`
    );
  }

  return email;
}

function getEmployeeName(
  email: string
): string {
  const localPart =
    email.split("@")[0];

  return localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function buildWeeklyWorkPlanEmail(
  employeeName: string
) {
  return {
    subject:
      "Alpha Brooks Energy — Weekly Work Plan Submission",

    bodyHtml: `
      <div
        style="
          font-family: Segoe UI, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #161A18;
        "
      >
        <p>Good morning ${employeeName},</p>

        <p>
          ARIA is requesting your work plan for this week.
        </p>

        <p>
          Please submit what you plan to accomplish for
          each working day:
        </p>

        <ul>
          <li>Monday</li>
          <li>Tuesday</li>
          <li>Wednesday</li>
          <li>Thursday</li>
          <li>Friday</li>
        </ul>

        <p>
          Please ensure that your weekly work plan is
          submitted within the required submission period.
        </p>

        <p>
          The weekly work-plan submission is available
          through the Alpha Brooks Energy dashboard.
        </p>

        <p>
          Thank you.
        </p>

        <p>
          <strong>ARIA</strong><br />
          Alpha Brooks Energy LTD
        </p>
      </div>
    `,
  };
}

async function sendWeeklyWorkPlanEmails() {
  const staffRecipients =
    getEmailList(
      process.env.ARIA_STAFF_RECIPIENTS
    );

  const bossEmail =
    getRequiredEmail(
      process.env.ARIA_BOSS_EMAIL,
      "ARIA_BOSS_EMAIL"
    );

  const itHeadEmail =
    getRequiredEmail(
      process.env.ARIA_IT_HEAD_EMAIL,
      "ARIA_IT_HEAD_EMAIL"
    );

  if (staffRecipients.length === 0) {
    throw new Error(
      "ARIA_STAFF_RECIPIENTS is not configured."
    );
  }

  /**
   * These are the two people who should be copied
   * on every staff member's email.
   */
  const ccRecipients = [
    bossEmail,
    itHeadEmail,
  ];

  let sent = 0;

  const failures: Array<{
    email: string;
    error: string;
  }> = [];

  /**
   * Send ONE separate email to every staff member.
   *
   * Example:
   *
   * TO: sales@...
   * CC: boss@..., it@...
   *
   * Then separately:
   *
   * TO: accounts@...
   * CC: boss@..., it@...
   *
   * Staff members therefore do not see one another
   * in the TO/CC list.
   */
  for (const employeeEmail of staffRecipients) {
    try {
      const employeeName =
        getEmployeeName(
          employeeEmail
        );

      const {
        subject,
        bodyHtml,
      } =
        buildWeeklyWorkPlanEmail(
          employeeName
        );

      /**
       * Do not CC the current recipient to themselves.
       *
       * This matters because IT Head is also included
       * in ARIA_STAFF_RECIPIENTS.
       */
      const employeeCcRecipients =
        ccRecipients.filter(
          (email) =>
            email !== employeeEmail
        );

      await sendAriaMail({
        to: employeeEmail,

        cc:
          employeeCcRecipients,

        subject,
        bodyHtml,
      });

      sent += 1;

      console.log(
        `[ARIA Weekly Work Plan] Sent to ${employeeEmail}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown email error.";

      failures.push({
        email: employeeEmail,
        error: errorMessage,
      });

      console.error(
        `[ARIA Weekly Work Plan] Failed for ${employeeEmail}:`,
        error
      );
    }
  }

  return {
    success:
      failures.length === 0,

    sent,

    total:
      staffRecipients.length,

    failures,
  };
}

/**
 * Vercel Cron endpoint.
 *
 * Vercel Cron calls this endpoint every Monday.
 *
 * Schedule:
 * 07:00 UTC
 *
 * Nigeria:
 * 08:00 WAT
 */
export async function GET(
  req: Request
) {
  const authorization =
    req.headers.get(
      "authorization"
    );

  if (
    !process.env.CRON_SECRET ||
    authorization !==
      `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const result =
      await sendWeeklyWorkPlanEmails();

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 207,
      }
    );
  } catch (error) {
    if (
      error instanceof
      CngMailConfigError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (
      error instanceof
      CngMailApiError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 502,
        }
      );
    }

    console.error(
      "[ARIA Weekly Work Plan] Unexpected error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send weekly work-plan emails.",
      },
      {
        status: 500,
      }
    );
  }
}