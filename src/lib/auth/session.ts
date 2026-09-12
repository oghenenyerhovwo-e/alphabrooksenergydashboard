import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

export const SESSION_COOKIE_NAME = "ab_session";
const OAUTH_STATE_COOKIE_NAME = "ab_oauth_state";

/** Sessions are valid for 7 days from creation — absolute expiry, no sliding window yet. Adjust here if that's wrong for your staff's usage pattern. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** The OAuth state/PKCE cookie only needs to survive the round trip to Microsoft and back. */
const OAUTH_STATE_TTL_SECONDS = 5 * 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Generates a fresh, high-entropy session token. Never store this raw value anywhere — only its hash. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Creates a Session row for the given user and sets the session cookie.
 * Call this only after the user has been verified against the User table.
 */
export async function createSessionAndSetCookie(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null }
): Promise<void> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent ?? undefined,
      ipAddress: meta.ipAddress ?? undefined,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Reads the session cookie, validates it against the database, and
 * returns the authenticated user — or null if there is no valid
 * session. Does not throw on missing/invalid sessions; callers decide
 * what "unauthenticated" means for their route.
 */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    // Expired — clean it up lazily rather than waiting on a cron.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.status !== "ACTIVE") return null;

  // "Last used" marker for visibility, not a sliding expiry — this does
  // not extend the session's actual lifetime.
  await prisma.session
    .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return session.user;
}

/** Deletes the current session from the database and clears the cookie. */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Stores the OAuth `state` and PKCE `codeVerifier` in a short-lived,
 * HttpOnly cookie between the /login redirect and the /callback
 * request. Both values are base64url strings (alphabet has no "."),
 * so joining them with "." is a safe, simple encoding.
 */
export async function setOAuthStateCookie(state: string, codeVerifier: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(OAUTH_STATE_COOKIE_NAME, `${state}.${codeVerifier}`, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: OAUTH_STATE_TTL_SECONDS,
  });
}

/** Reads and clears the OAuth state cookie, returning its parts, or null if absent/malformed. */
export async function consumeOAuthStateCookie(): Promise<{ state: string; codeVerifier: string } | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE_NAME);

  if (!raw) return null;
  const separatorIndex = raw.indexOf(".");
  if (separatorIndex === -1) return null;

  return {
    state: raw.slice(0, separatorIndex),
    codeVerifier: raw.slice(separatorIndex + 1),
  };
}