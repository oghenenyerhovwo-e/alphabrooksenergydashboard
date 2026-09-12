/**
 * Defense-in-depth CSRF guard for state-changing JSON API routes.
 *
 * This is NOT the primary defense. SameSite=Lax already keeps the session
 * cookie off cross-site fetch/XHR requests entirely (Lax only ever attaches
 * cookies to top-level navigations), and a JSON Content-Type on a
 * cross-origin request forces a CORS preflight this app doesn't answer
 * permissively. Together those already block the realistic CSRF paths
 * against these routes. This check is one more cheap layer on top.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");

  // Browsers normally send Origin on POST requests, same-origin or not.
  // Its absence is unusual enough (non-browser client, older browser,
  // certain proxies) that failing closed here would risk breaking
  // legitimate traffic that has always worked. Treat "unknown" as "allow"
  // and rely on the SameSite/CORS protections described above for that case.
  if (!origin) return true;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return true;

  try {
    return new URL(origin).host === new URL(appUrl).host;
  } catch {
    // Malformed Origin header — not something a real browser sends.
    return false;
  }
}