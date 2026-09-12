import { NextResponse } from "next/server";
import { getLoginClient, getRedirectUri, LOGIN_SCOPES, LoginConfigError } from "@/lib/auth/msal";
import { generateRandomToken, generateCodeChallenge } from "@/lib/auth/pkce";
import { setOAuthStateCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let authUrl: string;

  try {
    const client = getLoginClient();
    const state = generateRandomToken(16);
    const codeVerifier = generateRandomToken(32);
    const codeChallenge = generateCodeChallenge(codeVerifier);

    authUrl = await client.getAuthCodeUrl({
      scopes: LOGIN_SCOPES,
      redirectUri: getRedirectUri(),
      state,
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    await setOAuthStateCookie(state, codeVerifier);
  } catch (e) {
    if (e instanceof LoginConfigError) {
      console.error("[auth/login] configuration error:", e.message);
      return NextResponse.json({ error: "Login is not configured correctly." }, { status: 500 });
    }
    console.error("[auth/login] unexpected error:", e);
    return NextResponse.json({ error: "Could not start login." }, { status: 500 });
  }

  return NextResponse.redirect(authUrl);
}