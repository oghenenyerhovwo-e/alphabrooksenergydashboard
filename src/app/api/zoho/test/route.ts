import { NextResponse } from "next/server";
import { getZohoBooksAccessToken } from "@/lib/zoho/books";

export async function GET() {
  try {
    const accessToken = await getZohoBooksAccessToken();

    return NextResponse.json({
      success: true,
      message: "Alpha Brooks successfully authenticated with Zoho Books.",
      tokenReceived: Boolean(accessToken),
    });
  } catch (error) {
    console.error("Zoho authentication test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Zoho Books authentication failed.",
      },
      { status: 500 },
    );
  }
}