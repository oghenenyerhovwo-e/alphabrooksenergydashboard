import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";

/**
 * Standalone auth for the "quick delivery note" tool. This is deliberately
 * NOT the staff `ab_session` system — this page must work for anyone with
 * the shared password, independent of the main operations login, so it can
 * be handed to a driver/rep on a tablet without a staff account.
 */

export const QDN_COOKIE_NAME = "qdn_session";

/** Session is short-lived on purpose — this is a temporary/kiosk-style tool. */
const QDN_SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Reads the shared password from the environment. Trims whitespace and any
 * wrapping quotes so a value pasted as  "my-code"  or  my-code   still works.
 */
function getConfiguredPassword(): string | null {
  const raw = process.env.QUICK_DELIVERY_NOTE_PASSWORD;
  if (!raw) return null;

  const cleaned = raw.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** True when QUICK_DELIVERY_NOTE_PASSWORD is present on the server. */
export function isQuickNoteConfigured(): boolean {
  return getConfiguredPassword() !== null;
}

function getSecret(): string {
  const password = getConfiguredPassword();
  if (!password) {
    throw new Error(
      "Missing required configuration: QUICK_DELIVERY_NOTE_PASSWORD."
    );
  }
  return `qdn:${password}`;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Builds a signed, expiring token — not a DB-backed session, just a signed cookie value. */
function createToken(): string {
  const expiresAt = Date.now() + QDN_SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function isValidToken(token: string): boolean {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payload);
  } catch {
    return false;
  }

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt)) return false;

  return Date.now() < expiresAt;
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Constant-time password check. Both sides are trimmed (pasted codes often
 * carry a trailing space) and compared as SHA-256 digests so lengths and
 * unicode never matter.
 */
export function checkQuickNotePassword(candidate: string): boolean {
  const password = getConfiguredPassword();
  console.log(password)
  if (!password) return false;

  return timingSafeEqual(digest(candidate.trim()), digest(password));
}

/**
 * `secure` must only be true when the page is served over HTTPS. Browsers
 * silently drop Secure cookies on plain-http origins (e.g. a tablet opening
 * http://192.168.x.x:3000), which looks like "login does nothing".
 */
export async function createQuickNoteSessionCookie(
  secure: boolean
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(QDN_COOKIE_NAME, createToken(), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: QDN_SESSION_TTL_MS / 1000,
  });
}

export async function clearQuickNoteSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(QDN_COOKIE_NAME);
}

export async function hasValidQuickNoteSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(QDN_COOKIE_NAME)?.value;
  if (!token) return false;
  return isValidToken(token);
}