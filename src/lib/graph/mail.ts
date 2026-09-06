import { getGraphClient } from "./client";

/** Thrown when required mail configuration is missing. */
export class CngMailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngMailConfigError";
  }
}

/** Thrown when the Microsoft Graph sendMail call itself fails. */
export class CngMailApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngMailApiError";
  }
}

interface SendAriaMailOptions {
  to: string | string[];
  subject: string;
  bodyHtml: string;
}

/**
 * Sends mail via Microsoft Graph app-only auth, from the mailbox configured
 * in ARIA_SENDER_EMAIL. This is the ONLY function in the codebase that
 * knows how to send outbound mail — reuse it rather than calling Graph's
 * sendMail endpoint directly elsewhere.
 */
export async function sendAriaMail({ to, subject, bodyHtml }: SendAriaMailOptions): Promise<void> {
  const senderMailbox = process.env.ARIA_SENDER_EMAIL;
  if (!senderMailbox) {
    throw new CngMailConfigError("Missing required configuration: ARIA_SENDER_EMAIL.");
  }

  const toRecipients = (Array.isArray(to) ? to : [to]).map((address) => ({
    emailAddress: { address },
  }));

  const client = getGraphClient();

  try {
    await client.api(`/users/${senderMailbox}/sendMail`).post({
      message: {
        subject,
        body: { contentType: "HTML", content: bodyHtml },
        toRecipients,
      },
      saveToSentItems: true,
    });
  } catch (e) {
    console.error("[ARIA Mail] sendMail failed:", e);
    throw new CngMailApiError(
      "Failed to send mail via Microsoft Graph. Check the Mail.Send permission, admin consent, and ARIA_SENDER_EMAIL."
    );
  }
}