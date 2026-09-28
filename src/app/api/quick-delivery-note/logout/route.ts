import { NextResponse } from "next/server";
import { clearQuickNoteSessionCookie } from "@/lib/quickDeliveryNote/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearQuickNoteSessionCookie();
  return NextResponse.json({ ok: true });
}