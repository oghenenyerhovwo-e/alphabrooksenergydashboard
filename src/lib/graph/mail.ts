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
  listUnsubscribeUrl?: string;
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
  listUnsubscribeUrl,
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

  // "String 0x1045" is the MAPI property ID Outlook/Exchange use for the
  // List-Unsubscribe header. Setting it here is what makes Gmail (and some
  // other clients) show the native "Unsubscribe" link beside the sender
  // name. It opens the link in a browser tab (our confirmation page) rather
  // than unsubscribing silently — true one-click silent unsubscribe needs
  // a second header (List-Unsubscribe-Post) that Graph's JSON sendMail API
  // can't set at all; only raw MIME sending supports it.
  const singleValueExtendedProperties = listUnsubscribeUrl
    ? [
        {
          id: "String 0x1045",
          value: `<${listUnsubscribeUrl}>`,
        },
      ]
    : undefined;

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
        ...(singleValueExtendedProperties
          ? { singleValueExtendedProperties }
          : {}),
      },
      saveToSentItems: true,
    });

    // Graph's /sendMail returns 202 Accepted with an empty body, so a
    // resolved promise (no throw) is the confirmation signal — there's no
    // message ID to log. This line, plus the message showing up in
    // senderMailbox's Sent Items folder, is how to verify a send actually
    // went out.
    console.log(
      `[ARIA Mail] sendMail accepted — from ${senderMailbox} to ${toRecipients.map((r) => r.emailAddress.address).join(", ")} — "${subject}"`
    );
  } catch (e) {
    console.error("[ARIA Mail] sendMail failed:", e);

    throw new CngMailApiError(
      "Failed to send mail via Microsoft Graph. Check the Mail.Send permission, admin consent, and ARIA_SENDER_EMAIL."
    );
  }
}