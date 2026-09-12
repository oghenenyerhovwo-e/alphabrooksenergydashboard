import { randomBytes, createHash } from "crypto";

/** A high-entropy, URL-safe random token — used for both OAuth `state` and the PKCE code verifier. */
export function generateRandomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/** PKCE S256 code challenge derived from a code verifier. */
export function generateCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier).digest("base64url");
}