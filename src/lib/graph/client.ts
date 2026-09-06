import { ConfidentialClientApplication, type AuthenticationResult } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";

/** Thrown when required environment configuration is missing. */
export class CngConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngConfigError";
  }
}

/** Thrown when Microsoft Graph authentication itself fails (bad creds, no consent, etc). */
export class CngAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngAuthError";
  }
}

interface GraphAuthConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Reads and validates the three Azure AD app-registration values.
 * Does NOT check CNG_PLANNER_PLAN_ID — that's planner.ts's concern.
 */
export function readGraphConfig(): GraphAuthConfig {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const missing: string[] = [];
  if (!tenantId) missing.push("AZURE_TENANT_ID");
  if (!clientId) missing.push("AZURE_CLIENT_ID");
  if (!clientSecret) missing.push("AZURE_CLIENT_SECRET");

  if (missing.length > 0) {
    throw new CngConfigError(
      `Missing required Microsoft Graph configuration: ${missing.join(", ")}.`
    );
  }

  return { tenantId: tenantId!, clientId: clientId!, clientSecret: clientSecret! };
}

let cca: ConfidentialClientApplication | null = null;

function getConfidentialClient(): ConfidentialClientApplication {
  if (cca) return cca;

  const { tenantId, clientId, clientSecret } = readGraphConfig();

  cca = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  });

  return cca;
}

interface CachedToken {
  accessToken: string;
  expiresOnTimestamp: number;
}

let cachedToken: CachedToken | null = null;

/** Safety margin so we never hand out a token that expires mid-request. */
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 60_000;
/** Fallback lifetime if Graph doesn't return an explicit expiresOn (rare). */
const FALLBACK_TOKEN_LIFETIME_MS = 50 * 60 * 1000;

async function acquireAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresOnTimestamp - TOKEN_EXPIRY_SAFETY_MARGIN_MS > now) {
    return cachedToken.accessToken;
  }

  const client = getConfidentialClient();

  let result: AuthenticationResult | null;
  try {
    result = await client.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });
  } catch (e) {
    console.error("[CNG Graph] token acquisition threw:", e);
    throw new CngAuthError(
      "Failed to authenticate with Microsoft Graph. Verify AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET, and that admin consent has been granted."
    );
  }

  if (!result || !result.accessToken) {
    throw new CngAuthError(
      "Microsoft Graph authentication did not return an access token. Check the app registration's configuration."
    );
  }

  cachedToken = {
    accessToken: result.accessToken,
    expiresOnTimestamp: result.expiresOn ? result.expiresOn.getTime() : now + FALLBACK_TOKEN_LIFETIME_MS,
  };

  return cachedToken.accessToken;
}

let graphClient: Client | null = null;

/**
 * Returns a configured Microsoft Graph client using app-only (client
 * credentials) authentication. Server-side only — never import this
 * file from a client component.
 */
export function getGraphClient(): Client {
  // Validated eagerly so callers get a clear CngConfigError before any
  // network call is attempted, rather than a confusing auth failure.
  readGraphConfig();

  if (graphClient) return graphClient;

  graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () => acquireAccessToken(),
    },
  });

  return graphClient;
}