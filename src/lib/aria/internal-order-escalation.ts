import { prisma } from "@/lib/prisma";
import { sendAriaMail } from "@/lib/graph/mail";

const SLA_MINUTES = 15;

export interface InternalOrderEscalationResult {
  checked: number;
  escalated: number;
  skipped: number;
}

function buildEscalationEmail({
  orderReference,
  customerName,
  createdAt,
}: {
  orderReference: string;
  customerName: string;
  createdAt: Date;
}) {
  const createdAtText = createdAt.toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return {
    subject: `ARIA Escalation — Sales Action Required — ${orderReference}`,

    bodyHtml: `
      <div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;line-height:1.5;color:#1a1a1a;">
        <p style="margin:0 0 14px 0;font-weight:bold;font-size:16px;">
          ARIA ESCALATION
        </p>

        <p style="margin:0 0 12px 0;">
          The Sales Executive has not acknowledged the profitability/sales
          analysis notification for the following internal order within the
          15-minute SLA.
        </p>

        <p style="margin:0 0 6px 0;">
          <strong>Internal Order:</strong> ${orderReference}
        </p>

        <p style="margin:0 0 6px 0;">
          <strong>Customer:</strong> ${customerName}
        </p>

        <p style="margin:0 0 14px 0;">
          <strong>Order created:</strong> ${createdAtText}
        </p>

        <p style="margin:0;">
          Please follow up with the Sales Executive.
        </p>

        <p style="margin:20px 0 0 0;">
          Regards,<br/>
          ARIA<br/>
          Alpha Brooks Energy LTD
        </p>
      </div>
    `,
  };
}

export async function processInternalOrderEscalations(): Promise<InternalOrderEscalationResult> {
  const bossEmail = process.env.ARIA_BOSS_EMAIL;

  if (!bossEmail) {
    throw new Error(
      "Missing required configuration: ARIA_BOSS_EMAIL."
    );
  }

  const cutoff = new Date(
    Date.now() - SLA_MINUTES * 60 * 1000
  );

  const notifications = await prisma.notification.findMany({
    where: {
      internalOrderId: {
        not: null,
      },
      readAt: null,
      escalationSentAt: null,
      createdAt: {
        lte: cutoff,
      },
    },
    select: {
      id: true,
      createdAt: true,
      internalOrderId: true,
      recipient: {
        select: {
          email: true,
        },
      },
      internalOrder: {
        select: {
          referenceNumber: true,
          customerName: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let escalated = 0;
  let skipped = 0;

  for (const notification of notifications) {
    if (
      !notification.internalOrderId ||
      !notification.internalOrder ||
      !notification.recipient.email
    ) {
      skipped += 1;
      continue;
    }

    const email = buildEscalationEmail({
      orderReference:
        notification.internalOrder.referenceNumber,
      customerName:
        notification.internalOrder.customerName,
      createdAt: notification.createdAt,
    });

    try {
      await sendAriaMail({
        to: bossEmail,
        cc: notification.recipient.email,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
      });

      await prisma.notification.update({
        where: {
          id: notification.id,
        },
        data: {
          escalationSentAt: new Date(),
        },
      });

      escalated += 1;
    } catch (error) {
      /*
       * Do not mark the notification as escalated if the email failed.
       * The next ARIA run can retry it.
       */
      console.error(
        "[ARIA Internal Order Escalation] Failed:",
        error
      );
    }
  }

  return {
    checked: notifications.length,
    escalated,
    skipped,
  };
}