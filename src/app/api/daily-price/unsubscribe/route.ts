import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildUnsubscribeToken } from "@/lib/commercial/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlPage(message: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:60px 24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;text-align:center;">
    <div style="max-width:480px;margin:0 auto;">
      <div style="font-size:13px;letter-spacing:3px;font-weight:bold;color:#5a9f35;margin-bottom:16px;">ALPHABROOKS ENERGY</div>
      <p style="font-size:15px;line-height:1.6;">${message}</p>
    </div>
  </body>
</html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const token = url.searchParams.get("token");

  if (!email || !token) {
    return htmlPage(
      "This unsubscribe link is missing information and can't be used."
    );
  }

  let expectedToken: string;

  try {
    expectedToken = buildUnsubscribeToken(email);
  } catch (error) {
    console.error("[daily-price/unsubscribe] config error:", error);
    return htmlPage(
      "Something went wrong on our end. Please contact us directly to be removed from this list."
    );
  }

  const expectedBuf = Buffer.from(expectedToken);
  const gotBuf = Buffer.from(token);

  const isValid =
    expectedBuf.length === gotBuf.length &&
    timingSafeEqual(expectedBuf, gotBuf);

  if (!isValid) {
    return htmlPage("This unsubscribe link is invalid or has expired.");
  }

  await prisma.dailyPriceUnsubscribe.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  return htmlPage(
    `${email} has been unsubscribed from AlphaBrooks Energy daily price updates. Email us any time if you'd like to be added back.`
  );
}