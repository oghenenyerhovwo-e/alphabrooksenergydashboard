import { ConfidentialClientApplication } from "@azure/msal-node";

export class LoginConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginConfigError";
  }
}

interface LoginAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Reads and validates the Azure AD app-registration values used for
 * INTERACTIVE USER LOGIN. This is a deliberately separate app
 * registration from the one in src/lib/graph/client.ts, which does
 * app-only (service-to-service) Graph/Planner access. Keeping them
 * separate means rotating one client secret never affects the other.
 */
function readLoginConfig(): LoginAuthConfig {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_LOGIN_CLIENT_ID;
  const clientSecret = process.env.AZURE_LOGIN_CLIENT_SECRET;

  const missing: string[] = [];
  if (!tenantId) missing.push("AZURE_TENANT_ID");
  if (!clientId) missing.push("AZURE_LOGIN_CLIENT_ID");
  if (!clientSecret) missing.push("AZURE_LOGIN_CLIENT_SECRET");

  if (missing.length > 0) {
    throw new LoginConfigError(
      `Missing required login configuration: ${missing.join(", ")}.`
    );
  }

  return { tenantId: tenantId!, clientId: clientId!, clientSecret: clientSecret! };
}

let loginClient: ConfidentialClientApplication | null = null;

/**
 * Confidential client used ONLY for the interactive authorization-code
 * login flow. Server-side only — never import this file from a client
 * component.
 */
export function getLoginClient(): ConfidentialClientApplication {
  if (loginClient) return loginClient;

  const { tenantId, clientId, clientSecret } = readLoginConfig();

  loginClient = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  });

  return loginClient;
}

/** Delegated scopes requested at login. Kept minimal on purpose. */
export const LOGIN_SCOPES = ["openid", "profile", "email", "User.Read"];

export function getRedirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new LoginConfigError("Missing required configuration: NEXT_PUBLIC_APP_URL.");
  }
  return `${appUrl.replace(/\/$/, "")}/api/auth/callback`;
}