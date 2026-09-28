import { NextResponse } from "next/server";
import { hasValidQuickNoteSession } from "@/lib/quickDeliveryNote/session";
import { sendAriaMail } from "@/lib/graph/mail";
import { buildDeliveryNoteEmail } from "@/lib/quickDeliveryNote/emailTemplate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vercel caps request bodies at ~4.5MB, and Graph's sendMail is a JSON
// payload. The note PDF is a compressed JPEG page (a few hundred KB), so
// 3.5M base64 characters (~2.6MB raw) is generous headroom.
const MAX_BASE64_LENGTH = 3_500_000;

interface SendBody {
  noteNumber?: unknown;
  senderEmail?: unknown;
  clientEmail?: unknown;
  pdfBase64?: unknown;
  customer?: unknown;
  product?: unknown;
  quantity?: unknown;
  unit?: unknown;
  deliveredAtLabel?: unknown;
  representativeName?: unknown;
  receiverName?: unknown;
}

function str(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const authed = await hasValidQuickNoteSession();
  if (!authed) {
    return NextResponse.json({ error: "Session expired." }, { status: 401 });
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const noteNumber =
    typeof body.noteNumber === "string" ? body.noteNumber.trim() : "";
  const senderEmail =
    typeof body.senderEmail === "string" ? body.senderEmail.trim() : "";
  const clientEmail =
    typeof body.clientEmail === "string" ? body.clientEmail.trim() : "";
  const pdfBase64 =
    typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";

  if (!noteNumber) {
    return NextResponse.json(
      { error: "Missing delivery note number." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(senderEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address for your own copy." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(clientEmail)) {
    return NextResponse.json(
      { error: "Enter a valid email address for the client." },
      { status: 400 }
    );
  }

  if (!pdfBase64) {
    return NextResponse.json(
      { error: "The document could not be generated. Please try again." },
      { status: 400 }
    );
  }

  if (pdfBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "The generated document is too large to send." },
      { status: 400 }
    );
  }

  try {
    await sendAriaMail({
      to: [senderEmail, clientEmail],
      subject: `Delivery Note ${noteNumber} — Alpha Brooks Energy`,
      bodyHtml: buildDeliveryNoteEmail({
        noteNumber,
        customer: str(body.customer),
        product: str(body.product),
        quantity: str(body.quantity, 50),
        unit: str(body.unit, 50),
        deliveredAtLabel: str(body.deliveredAtLabel),
        representativeName: str(body.representativeName),
        receiverName: str(body.receiverName),
        senderEmail,
      }),
      attachments: [
        {
          name: `Delivery-Note-${noteNumber}.pdf`,
          contentType: "application/pdf",
          contentBytes: pdfBase64,
        },
      ],
    });
  } catch (error) {
    console.error("[quick-delivery-note/send]", error);
    return NextResponse.json(
      { error: "Could not send the delivery note. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}