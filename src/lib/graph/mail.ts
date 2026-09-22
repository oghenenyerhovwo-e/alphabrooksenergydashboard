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
  cc?: string | string[];
  subject: string;
  bodyHtml: string;
  from?: string;
}

/**
 * Sends mail via Microsoft Graph app-only auth, from the mailbox configured
 * in ARIA_SENDER_EMAIL.
 *
 * This remains the single outbound-mail function used by the application.
 */
export async function sendAriaMail({
  to,
  cc,
  subject,
  bodyHtml,
  from,
}: SendAriaMailOptions): Promise<void> {
  const senderMailbox = from || process.env.ARIA_SENDER_EMAIL;

  if (!senderMailbox) {
    throw new CngMailConfigError(
      "Missing required configuration: ARIA_SENDER_EMAIL."
    );
  }

  const toRecipients = (Array.isArray(to) ? to : [to])
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => ({
      emailAddress: { address },
    }));

  const ccRecipients = (Array.isArray(cc) ? cc : cc ? [cc] : [])
    .map((address) => address.trim())
    .filter(Boolean)
    .map((address) => ({
      emailAddress: { address },
    }));

  if (toRecipients.length === 0) {
    throw new CngMailConfigError(
      "At least one recipient is required."
    );
  }

  const client = getGraphClient();

  try {
    await client.api(`/users/${senderMailbox}/sendMail`).post({
      message: {
        subject,
        body: {
          contentType: "HTML",
          content: bodyHtml,
        },
        toRecipients,
        ...(ccRecipients.length > 0
          ? { ccRecipients }
          : {}),
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