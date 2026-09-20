import { NextRequest, NextResponse } from "next/server";

/**
 * The session cookie name is deliberately defined locally in middleware.
 *
 * Do NOT import this from "@/lib/auth/session" because that module imports
 * Prisma and Node-only crypto functionality. Middleware must remain
 * independent of Prisma.
 */
const SESSION_COOKIE_NAME = "ab_session";

/**
 * Cheap, DB-free gate.
 *
 * This only checks whether a session cookie is PRESENT. It does not validate
 * the session against the database. Real authentication enforcement happens
 * in the root layout and protected route handlers.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  const hasSessionCookie = Boolean(
    req.cookies.get(SESSION_COOKIE_NAME)?.value
  );

  const isZohoTestRoute =
  pathname === "/api/zoho/test" ||
  pathname === "/api/zoho/organization-test";
  
  if (hasSessionCookie || pathname === "/login" || isZohoTestRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const loginUrl = new URL("/login", req.url);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Run on everything EXCEPT:
     *
     * - /api/auth/*
     *   The login flow itself must remain reachable without a session.
     *
     * - /api/aria/report/send
     * - /api/aria/report/main/send
     * - /api/aria/team-intro/send
     * - /api/aria/test-mail
     *   These are protected separately by CRON_SECRET /
     *   ARIA_INTERNAL_TOKEN and therefore do not have a session cookie.
     *
     * - /api/operations/reports/capture
     *   This endpoint is also intentionally handled by its own
     *   authentication mechanism and must not require ab_session.
     *
     * - Next.js internals and static assets.
     */
    "/((?!api/auth|api/aria/report/send|api/aria/report/main/send|api/aria/team-intro/send|api/aria/test-mail|api/operations/reports/capture|_next/static|_next/image|favicon.ico).*)",
  ],
};