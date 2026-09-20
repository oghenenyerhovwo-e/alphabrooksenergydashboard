import "server-only";

const ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com/oauth/v2/token";

type ZohoTokenResponse = {
  access_token: string;
  expires_in: number;
  api_domain: string;
  token_type: string;
};

function getZohoConfig() {
  const organizationId = process.env.ZOHO_BOOKS_ORGANIZATION_ID;
  const clientId = process.env.ZOHO_BOOKS_CLIENT_ID;
  const clientSecret = process.env.ZOHO_BOOKS_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_BOOKS_REFRESH_TOKEN;

  if (!organizationId) {
    throw new Error("Missing ZOHO_BOOKS_ORGANIZATION_ID");
  }

  if (!clientId) {
    throw new Error("Missing ZOHO_BOOKS_CLIENT_ID");
  }

  if (!clientSecret) {
    throw new Error("Missing ZOHO_BOOKS_CLIENT_SECRET");
  }

  if (!refreshToken) {
    throw new Error("Missing ZOHO_BOOKS_REFRESH_TOKEN");
  }

  return {
    organizationId,
    clientId,
    clientSecret,
    refreshToken,
  };
}

export async function getZohoBooksAccessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = getZohoConfig();

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

 let response: Response;

try {
  response = await fetch(ZOHO_ACCOUNTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
} catch (error) {
  console.error("Zoho token request failed:", error);

  throw new Error(
    `Zoho token request failed: ${
      error instanceof Error ? error.message : "Unknown network error"
    }`,
  );
}

const data = (await response.json()) as
  | ZohoTokenResponse
  | { error: string };

  if (!response.ok || "error" in data) {
    const error =
      "error" in data ? data.error : `HTTP ${response.status}`;

    throw new Error(`Zoho authentication failed: ${error}`);
  }

  return data.access_token;
}

export function getZohoBooksOrganizationId(): string {
  return getZohoConfig().organizationId;
}

export type ZohoCustomer = {
  contactId: string;
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
};

export type ZohoCustomerMatch = {
  contactId: string;
  contactName: string;
  companyName: string;
  phone: string;
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isSimilarCompanyName(
  prospectCompanyName: string,
  zohoCompanyName: string,
): boolean {
  const prospect = normalizeText(prospectCompanyName);
  const zoho = normalizeText(zohoCompanyName);

  if (!prospect || !zoho) {
    return false;
  }

  if (prospect === zoho) {
    return true;
  }

  return prospect.includes(zoho) || zoho.includes(prospect);
}

async function searchZohoCustomers(searchText: string) {
  const accessToken = await getZohoBooksAccessToken();
  const organizationId = getZohoBooksOrganizationId();

  const url = new URL(
    "https://www.zohoapis.com/books/v3/contacts",
  );

  url.searchParams.set("organization_id", organizationId);
  url.searchParams.set("contact_type", "customer");
  url.searchParams.set("search_text", searchText);
  url.searchParams.set("per_page", "200");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Zoho customer search failed:", data);

    throw new Error(
      data?.message || "Zoho customer search failed.",
    );
  }

  return Array.isArray(data?.contacts)
    ? (data.contacts as ZohoCustomer[])
    : [];
}

export async function listZohoCustomers(): Promise<ZohoCustomer[]> {
  const accessToken = await getZohoBooksAccessToken();
  const organizationId = getZohoBooksOrganizationId();

  const customers: ZohoCustomer[] = [];

  let page = 1;
  let hasMorePage = true;

  while (hasMorePage) {
    const url = new URL(
      "https://www.zohoapis.com/books/v3/contacts",
    );

    url.searchParams.set("organization_id", organizationId);
    url.searchParams.set("contact_type", "customer");
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "200");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Zoho customer list failed:", data);

      throw new Error(
        data?.message || "Zoho customer list failed.",
      );
    }

    if (Array.isArray(data?.contacts)) {
      for (const customer of data.contacts as Array<{
        contactId?: string | number;
        contactName?: string;
        companyName?: string;
        phone?: string;
        email?: string;
      }>) {
        if (!customer.contactId) {
          continue;
        }

        customers.push({
          contactId: String(customer.contactId),
          contactName: customer.contactName || "",
          companyName: customer.companyName || "",
          phone: customer.phone || "",
          email: customer.email || "",
        });
      }
    }

    hasMorePage = data?.page_context?.has_more_page === true;
    page += 1;
  }

  return customers;
}

export async function findZohoCustomerMatches({
  companyName,
  phone,
}: {
  companyName: string;
  phone: string;
}): Promise<{
  similarNameMatches: ZohoCustomerMatch[];
  exactPhoneMatches: ZohoCustomerMatch[];
}> {
  const similarNameMatches: ZohoCustomerMatch[] = [];
  const exactPhoneMatches: ZohoCustomerMatch[] = [];

  if (companyName.trim()) {
    const nameResults = await searchZohoCustomers(companyName);

    for (const customer of nameResults) {
      const zohoCompanyName = customer.companyName || "";

      if (
        customer.contactId &&
        isSimilarCompanyName(companyName, zohoCompanyName)
      ) {
        similarNameMatches.push({
          contactId: customer.contactId,
          contactName: customer.contactName || "",
          companyName: zohoCompanyName,
          phone: customer.phone || "",
        });
      }
    }
  }

  if (phone.trim()) {
    const phoneResults = await searchZohoCustomers(phone);
    const normalizedProspectPhone = normalizePhone(phone);

    for (const customer of phoneResults) {
      const customerPhone = normalizePhone(customer.phone || "");

      if (
        customer.contactId &&
        normalizedProspectPhone &&
        customerPhone === normalizedProspectPhone
      ) {
        exactPhoneMatches.push({
          contactId: customer.contactId,
          contactName: customer.contactName || "",
          companyName: customer.companyName || "",
          phone: customer.phone || "",
        });
      }
    }
  }

  const uniqueSimilarNameMatches = Array.from(
    new Map(
      similarNameMatches.map((customer) => [
        customer.contactId,
        customer,
      ]),
    ).values(),
  );

  const uniqueExactPhoneMatches = Array.from(
    new Map(
      exactPhoneMatches.map((customer) => [
        customer.contactId,
        customer,
      ]),
    ).values(),
  );

  return {
    similarNameMatches: uniqueSimilarNameMatches,
    exactPhoneMatches: uniqueExactPhoneMatches,
  };
}

export type CreateZohoCustomerInput = {
  companyName: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};

export type CreatedZohoCustomer = {
  contactId: string;
  contactName: string;
  companyName: string;
};

type ZohoCreateCustomerResponse = {
  code?: number;
  message?: string;
  contact?: {
    contactId?: string | number;
    contactName?: string;
    companyName?: string;
  };
};

function splitContactPersonName(value: string): {
  firstName: string;
  lastName?: string;
} {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export async function createZohoCustomer(
  input: CreateZohoCustomerInput,
): Promise<CreatedZohoCustomer> {
  const companyName = input.companyName.trim();

  if (!companyName) {
    throw new Error("Company name is required to create a Zoho customer.");
  }

  const accessToken = await getZohoBooksAccessToken();
  const organizationId = getZohoBooksOrganizationId();

  const body: Record<string, unknown> = {
    contactName: companyName,
    companyName: companyName,
    contact_type: "customer",
  };

  if (input.email?.trim()) {
    body.email = input.email.trim();
  }

  if (input.phone?.trim()) {
    body.phone = input.phone.trim();
  }

  if (input.notes?.trim()) {
    body.notes = input.notes.trim();
  }

  if (input.contactPerson?.trim()) {
    const contactPerson = splitContactPersonName(
      input.contactPerson,
    );

    body.contact_persons = [
      {
        first_name: contactPerson.firstName,
        ...(contactPerson.lastName
          ? { last_name: contactPerson.lastName }
          : {}),
        email: input.email?.trim() || undefined,
        phone: input.phone?.trim() || undefined,
        is_primary_contact: true,
      },
    ];
  }

  const url = new URL(
    "https://www.zohoapis.com/books/v3/contacts",
  );

  url.searchParams.set("organization_id", organizationId);

  let response: Response;

  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Zoho customer creation request failed:", error);

    throw new Error(
      `Zoho customer creation request failed: ${
        error instanceof Error
          ? error.message
          : "Unknown network error"
      }`,
    );
  }

  const data = (await response.json()) as ZohoCreateCustomerResponse;

  if (
    !response.ok ||
    data.code !== 0 ||
    !data.contact?.contactId
  ) {
    console.error("Zoho customer creation failed:", {
      status: response.status,
      code: data.code,
      message: data.message,
    });

    throw new Error(
      data.message || "Zoho Books customer creation failed.",
    );
  }

  return {
    contactId: String(data.contact.contactId),
    contactName:
      data.contact.contactName || companyName,
    companyName:
      data.contact.companyName || companyName,
  };
}