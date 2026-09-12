import { NextResponse } from "next/server";
import { getLoginClient, getRedirectUri, LOGIN_SCOPES, LoginConfigError } from "@/lib/auth/msal";
import { consumeOAuthStateCookie, createSessionAndSetCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(baseUrl: string, reason: string): NextResponse {
  // Previously targeted "/" — but "/" requires a session, so the layout
  // immediately bounced it to /api/auth/login and the error was lost
  // before anyone saw it. /login is the one route built to show it.
  const url = new URL("/login", baseUrl);
  url.searchParams.set("authError", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    console.error(
      "[auth/callback] Microsoft returned an error:",
      errorParam,
      url.searchParams.get("error_description")
    );
    return redirectWithError(appUrl, "login_failed");
  }

  if (!code || !returnedState) {
    return redirectWithError(appUrl, "invalid_request");
  }

  const stored = await consumeOAuthStateCookie();
  if (!stored || stored.state !== returnedState) {
    // Missing/expired/mismatched state — likely a stale link or a forged callback.
    return redirectWithError(appUrl, "invalid_state");
  }

  try {
    const client = getLoginClient();
    const result = await client.acquireTokenByCode({
      code,
      scopes: LOGIN_SCOPES,
      redirectUri: getRedirectUri(),
      codeVerifier: stored.codeVerifier,
    });

    const oid =
      result?.idTokenClaims && "oid" in result.idTokenClaims
        ? (result.idTokenClaims as { oid?: string }).oid
        : undefined;

    if (!oid) {
      console.error("[auth/callback] token response had no oid claim");
      return redirectWithError(appUrl, "login_failed");
    }

    const user = await prisma.user.findUnique({ where: { entraId: oid } });

    if (!user) {
      // Deliberately do not create users on first login — the User
      // table, seeded in 2.2, is the source of truth for who's allowed in.
      return redirectWithError(appUrl, "not_authorized");
    }

    if (user.status !== "ACTIVE") {
      return redirectWithError(appUrl, "account_disabled");
    }

    await createSessionAndSetCookie(user.id, {
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });
  } catch (e) {
    if (e instanceof LoginConfigError) {
      console.error("[auth/callback] configuration error:", e.message);
      return redirectWithError(appUrl, "login_failed");
    }
    console.error("[auth/callback] unexpected error:", e);
    return redirectWithError(appUrl, "login_failed");
  }

  return NextResponse.redirect(new URL("/", appUrl));
}