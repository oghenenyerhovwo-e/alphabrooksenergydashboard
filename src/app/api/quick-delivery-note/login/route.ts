import { NextResponse } from "next/server";
import {
  checkQuickNotePassword,
  createQuickNoteSessionCookie,
  isQuickNoteConfigured,
} from "@/lib/quickDeliveryNote/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isQuickNoteConfigured()) {
    return NextResponse.json(
      {
        error:
          "The access code is not set on the server. Add QUICK_DELIVERY_NOTE_PASSWORD to the environment, then restart the dev server (or redeploy on Vercel).",
      },
      { status: 500 }
    );
  }

  let password = "";

  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") {
      password = body.password;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  if (!password.trim() || !checkQuickNotePassword(password)) {
    return NextResponse.json(
      { error: "Incorrect password." },
      { status: 401 }
    );
  }

  // Only mark the cookie Secure on real HTTPS, otherwise browsers discard it.
  const isHttps =
    new URL(req.url).protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";

  await createQuickNoteSessionCookie(isHttps);

  return NextResponse.json({ ok: true });
}