import { NextResponse } from "next/server";
import { findZohoCustomerMatches } from "@/lib/zoho/books";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be signed in.",
        },
        { status: 401 },
      );
    }

    const body = await request.json();

    const companyName =
      typeof body?.companyName === "string"
        ? body.companyName.trim()
        : "";

    const phone =
      typeof body?.phone === "string"
        ? body.phone.trim()
        : "";

    if (!companyName && !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "Company name or phone number is required.",
        },
        { status: 400 },
      );
    }

    const matches = await findZohoCustomerMatches({
      companyName,
      phone,
    });

    return NextResponse.json({
      success: true,
      similarNameMatches: matches.similarNameMatches,
      exactPhoneMatches: matches.exactPhoneMatches,
    });
  } catch (error) {
    console.error("Zoho customer search route failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Zoho customer search failed.",
      },
      { status: 500 },
    );
  }
}