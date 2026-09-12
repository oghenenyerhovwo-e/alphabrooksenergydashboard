import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/auth/origin";

/**
 * Authorizes client-side signature uploads to Vercel Blob.
 *
 * The signature PNG bytes never pass through this server —
 * the browser uploads directly to Vercel Blob using a short-lived
 * token issued here. This keeps signature uploads outside the
 * server action body-size limit and off our own compute.
 */
export async function POST(
  request: Request
): Promise<NextResponse> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        /*
         * Only allow uploads into the signatures/ prefix,
         * and only PNGs (that's all the signature pad ever
         * produces).
         */
        if (!pathname.startsWith("signatures/")) {
          throw new Error(
            "Invalid upload path."
          );
        }

        return {
          allowedContentTypes: ["image/png"],
          addRandomSuffix: true,
          maximumSizeInBytes: 2 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // No follow-up action needed — the caller
        // receives the blob URL directly and attaches
        // it to the delivery via completeDeliveryAction.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    // Log full detail server-side, but don't hand arbitrary internal
    // error text to the client. The one message we throw ourselves
    // above ("Invalid upload path.") is safe to surface as-is; anything
    // else (library internals, unexpected failures) becomes generic.
    console.error("[signature-upload]", error);

    const isKnownValidationError =
      error instanceof Error && error.message === "Invalid upload path.";

    return NextResponse.json(
      {
        error: isKnownValidationError ? error.message : "Could not authorize the upload.",
      },
      { status: 400 }
    );
  }
}