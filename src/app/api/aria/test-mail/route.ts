import { NextResponse } from "next/server";
import { sendAriaMail, CngMailConfigError, CngMailApiError } from "@/lib/graph/mail";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-aria-internal-token");
  if (!token || token !== process.env.ARIA_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { to?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.to) {
    return NextResponse.json({ error: "'to' is required." }, { status: 400 });
  }

  try {
    await sendAriaMail({
      to: body.to,
      subject: "ARIA test email",
      bodyHtml: "<p>This is a test email from ARIA's mail pipeline. If you're reading this, Stage F.1 works.</p>",
    });
    return NextResponse.json({ sent: true });
  } catch (e) {
    if (e instanceof CngMailConfigError || e instanceof CngConfigError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    if (e instanceof CngMailApiError || e instanceof CngAuthError) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    console.error("[ARIA test-mail] unexpected error:", e);
    return NextResponse.json({ error: "Unexpected error sending test mail." }, { status: 500 });
  }
}