/**
 * Email body for the quick delivery note. Visually mirrors the daily price
 * email (buildDailyPriceEmail in src/lib/commercial/actions.ts): same white
 * 600px layout, gold summary card, green sign-off, logo, address, website /
 * social links and legal footer. It is transactional, so there is no
 * unsubscribe link.
 *
 * Kept in its own module because actions.ts is a "use server" file and
 * cannot export the price template's helpers.
 */

const COMPANY_WEBSITE_URL =
  process.env.COMPANY_WEBSITE_URL || "https://alphabrooksenergy.com";

const MAIL_LOGO_URL = `${(
  process.env.NEXT_PUBLIC_APP_URL || "https://alphabrooksenergy.com"
).replace(/\/$/, "")}/images/mail_logo.png`;

const COMPANY_SOCIAL_LINKS: { label: string; url: string }[] = [
  process.env.COMPANY_LINKEDIN_URL
    ? { label: "LinkedIn", url: process.env.COMPANY_LINKEDIN_URL }
    : null,
  process.env.COMPANY_INSTAGRAM_URL
    ? { label: "Instagram", url: process.env.COMPANY_INSTAGRAM_URL }
    : null,
  process.env.COMPANY_X_URL
    ? { label: "X (Twitter)", url: process.env.COMPANY_X_URL }
    : null,
  process.env.COMPANY_FACEBOOK_URL
    ? { label: "Facebook", url: process.env.COMPANY_FACEBOOK_URL }
    : null,
].filter((link): link is { label: string; url: string } => link !== null);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface DeliveryNoteEmailInput {
  noteNumber: string;
  customer: string;
  product: string;
  quantity: string;
  unit: string;
  deliveredAtLabel: string;
  representativeName: string;
  receiverName: string;
  senderEmail: string;
}

function detailRow(label: string, value: string): string {
  return `
            <tr>
              <td style="font-size:13px;color:#806b25;padding:6px 0;border-bottom:1px dashed #eadcae;text-align:left;">${escapeHtml(label)}</td>
              <td style="font-size:13px;font-weight:bold;color:#1a1a1a;padding:6px 0;border-bottom:1px dashed #eadcae;text-align:right;">${escapeHtml(value || "—")}</td>
            </tr>`;
}

export function buildDeliveryNoteEmail(input: DeliveryNoteEmailInput): string {
  const noteNumber = escapeHtml(input.noteNumber);
  const senderEmail = escapeHtml(input.senderEmail);
  const quantityLine = `${input.quantity} ${input.unit}`.trim();

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
    <div style="max-width:600px;margin:0 auto;padding:28px 20px;">

      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Hello,
      </p>

      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        Please find attached the signed delivery note for your recent delivery from AlphaBrooks Energy Limited.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td align="center" style="background:#f7f2df;border:1px solid #eadcae;border-radius:12px;padding:22px 20px;">
            <div style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#806b25;">
              DELIVERY NOTE
            </div>
            <div style="font-size:28px;font-weight:800;color:#17624b;margin-top:6px;margin-bottom:14px;">
              ${noteNumber}
            </div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${detailRow("Customer", input.customer)}
              ${detailRow("Product", input.product)}
              ${detailRow("Quantity", quantityLine)}
              ${detailRow("Delivered on", input.deliveredAtLabel)}
              ${detailRow("Received by", input.receiverName)}
              ${detailRow("Delivered by", input.representativeName)}
            </table>
          </td>
        </tr>
      </table>

      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
        The signed PDF copy is attached. Please keep it for your records. If anything looks incorrect, reply to this email and our team will assist.
      </p>

      <p style="font-size:14px;line-height:1.7;margin:0 0 4px;">
        Warm regards,<br />
        <strong style="color:#5a9f35;">Operations Team</strong><br />
        <strong>AlphaBrooks Energy Limited</strong><br />
        📧 ${senderEmail}
      </p>

      <img
        src="${MAIL_LOGO_URL}"
        alt="AlphaBrooks Energy"
        width="90"
        style="margin-top:18px;display:block;"
      />

      <p style="font-size:12px;color:#9aa59f;margin-top:10px;">
        Adeyemo Alakija, Victoria Island, Lagos
      </p>

      <p style="font-size:12px;color:#9aa59f;margin-top:16px;">
        <a href="${COMPANY_WEBSITE_URL}" style="color:#17624b;text-decoration:none;">${COMPANY_WEBSITE_URL.replace(/^https?:\/\//, "")}</a>
        ${
          COMPANY_SOCIAL_LINKS.length > 0
            ? " &nbsp;|&nbsp; " +
              COMPANY_SOCIAL_LINKS.map(
                (link) =>
                  `<a href="${link.url}" style="color:#17624b;text-decoration:none;">${link.label}</a>`
              ).join(" &nbsp;|&nbsp; ")
            : ""
        }
      </p>

      <p style="font-size:10.5px;line-height:1.6;color:#9aa59f;margin-top:26px;border-top:1px solid #edf0ed;padding-top:16px;">
        The information in this e-mail is regarded as official, confidential, legally privileged and intended solely for the designated recipient(s). Any otherwise usage would be regarded as unauthorized. If this e-mail is received in error, please reply to the sender with the caption "Received in error," and immediately delete the e-mail and copies (if any). Unauthorized disclosure, copying, distribution or any dealings with the contents in this e-mail is prohibited, unlawful and actionable under our laws. Alpha Brooks Energy Limited hereby abdicates itself from any liability resulting from the unintended opinions, conclusions, interpretation of the information in this e-mail and any attachments thereto. Alpha Brooks Energy Limited cannot guarantee that e-mail communications are secure or error-free, as information could be intercepted, corrupted, amended, lost, destroyed, arrive late or incomplete, or contain viruses. Alpha Brooks Energy Limited is a licensed mid-downstream oil and gas company by the Nigerian Midstream and Downstream Petroleum Regulatory Authority registered and operates in accordance with all applicable Nigerian laws and regulations.
      </p>

    </div>
  </body>
</html>
`;
}