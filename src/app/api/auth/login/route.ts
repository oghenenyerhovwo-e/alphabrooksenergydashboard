import { NextResponse } from "next/server";
import {
  getLoginClient,
  getRedirectUri,
  LOGIN_SCOPES,
  LoginConfigError,
} from "@/lib/auth/msal";
import {
  generateRandomToken,
  generateCodeChallenge,
} from "@/lib/auth/pkce";
import { setOAuthStateCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let authUrl: string;

  try {
    const requestUrl = new URL(req.url);

    /*
     * Teams sends ?teams=1 when authentication is being
     * performed from the Teams authentication popup.
     */
    const teamsAuth = requestUrl.searchParams.get("teams") === "1";

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

    /*
     * Store whether this authentication flow belongs to
     * the Teams popup.
     */
    await setOAuthStateCookie(
      state,
      codeVerifier,
      teamsAuth
    );
  } catch (e) {
    if (e instanceof LoginConfigError) {
      console.error(
        "[auth/login] configuration error:",
        e.message
      );

      return NextResponse.json(
        {
          error:
            "Login is not configured correctly.",
        },
        { status: 500 }
      );
    }

    console.error(
      "[auth/login] unexpected error:",
      e
    );

    return NextResponse.json(
      {
        error: "Could not start login.",
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(authUrl);
}