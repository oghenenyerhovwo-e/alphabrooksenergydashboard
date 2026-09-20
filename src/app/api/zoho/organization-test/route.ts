import { NextResponse } from "next/server";
import {
  getZohoBooksAccessToken,
  getZohoBooksOrganizationId,
} from "@/lib/zoho/books";

export async function GET() {
  try {
    const accessToken = await getZohoBooksAccessToken();
    const organizationId = getZohoBooksOrganizationId();

    const url = new URL(
      "https://www.zohoapis.com/books/v3/contacts",
    );

    url.searchParams.set("organization_id", organizationId);
    url.searchParams.set("contact_type", "customer");
    url.searchParams.set("per_page", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Zoho customer access test failed:", data);

      return NextResponse.json(
        {
          success: false,
          message: "Zoho customer access failed.",
          zohoStatus: response.status,
          zohoCode: data?.code ?? null,
          zohoMessage: data?.message ?? null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Alpha Brooks successfully accessed Zoho Books customers.",
      organizationId,
      customerAccessConfirmed: true,
      customerCountReturned: Array.isArray(data?.contacts)
        ? data.contacts.length
        : 0,
    });
  } catch (error) {
    console.error("Zoho customer access test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Zoho customer access failed.",
      },
      { status: 500 },
    );
  }
}