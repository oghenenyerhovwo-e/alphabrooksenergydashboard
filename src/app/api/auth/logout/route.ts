import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST-only deliberately — logout changes state, so it shouldn't be triggerable by a plain link or <img> tag. */
export async function POST(req: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", req.url));
}