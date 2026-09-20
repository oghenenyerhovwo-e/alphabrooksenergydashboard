import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listZohoCustomers } from "@/lib/zoho/books";

export async function GET() {
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

    const customers = await listZohoCustomers();

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Zoho customer list route failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Zoho customer list failed.",
      },
      { status: 500 },
    );
  }
}