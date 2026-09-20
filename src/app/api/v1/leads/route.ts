import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { DeliveryProduct, LeadSource } from "@/generated/prisma/client";
import { generateLeadReferenceNumber } from "@/lib/commercial/referenceNumber";
import { createNewLeadNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientAddress(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now >= existing.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return false;
  }

  existing.count += 1;

  return existing.count > RATE_LIMIT_MAX_REQUESTS;
}

function safeCompareSecret(
  provided: string,
  expected: string
): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    expectedBuffer
  );
}

function cleanString(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, maxLength);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const VALID_PRODUCTS = [
  "CNG",
  "AGO",
  "PMS",
  "LPG_BULK",
  "LPG_CYLINDERS",
  "OTHER",
] as const;

function isValidProduct(
  value: string
): value is (typeof VALID_PRODUCTS)[number] {
  return VALID_PRODUCTS.includes(
    value as (typeof VALID_PRODUCTS)[number]
  );
}

export async function POST(request: Request) {
  const expectedApiKey =
    process.env.ALPHA_BROOKS_WEBSITE_API_KEY;

  if (!expectedApiKey) {
    console.error(
      "[website-lead-api] ALPHA_BROOKS_WEBSITE_API_KEY is not configured."
    );

    return NextResponse.json(
      { error: "Lead submission service is not configured." },
      { status: 503 }
    );
  }

  const providedApiKey =
    request.headers.get("x-alpha-brooks-api-key");

  if (
    !providedApiKey ||
    !safeCompareSecret(providedApiKey, expectedApiKey)
  ) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  const clientAddress = getClientAddress(request);

  if (isRateLimited(clientAddress)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      }
    );
  }

  const contentLength = request.headers.get("content-length");

  if (
    contentLength &&
    Number(contentLength) > MAX_BODY_BYTES
  ) {
    return NextResponse.json(
      { error: "Request is too large." },
      { status: 413 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400 }
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const payload = body as Record<string, unknown>;

  const companyName = cleanString(payload.companyName, 200);
  const contactPerson = cleanString(payload.contactPerson, 200);
  const phone = cleanString(payload.phone, 50);
  const email = cleanString(payload.email, 320);
  const location = cleanString(payload.location, 300);
  const notes = cleanString(payload.notes, 2000);
  const productInterest = cleanString(
    payload.productInterest,
    50
  );

  if (!companyName) {
    return NextResponse.json(
      { error: "Company/lead name is required." },
      { status: 400 }
    );
  }

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (
    productInterest &&
    !isValidProduct(productInterest)
  ) {
    return NextResponse.json(
      { error: "Invalid product interest." },
      { status: 400 }
    );
  }

  try {
    const referenceNumber =
      await generateLeadReferenceNumber();

    const lead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          referenceNumber,
          companyName,
          contactPerson,
          phone,
          email,
          location,
          notes,

          // The API controls this value.
          // The website cannot choose another LeadSource.
          source: LeadSource.WEBSITE,

          productInterest: productInterest
            ? (productInterest as DeliveryProduct)
            : undefined,

          // Website submissions have no human dashboard creator.
          createdById: null,
        },
      });

      await tx.commercialAuditLog.create({
        data: {
          leadId: created.id,
          actorName: "Website",
          actorRole: "SYSTEM",
          action: "LEAD_CREATED",
          details: `Lead ${referenceNumber} created from the Alpha Brooks website.`,
        },
      });

      return created;
    });

    await createNewLeadNotification(
      lead.id,
      lead.referenceNumber
    );

    return NextResponse.json(
      {
        success: true,
        referenceNumber: lead.referenceNumber,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[website-lead-api]", error);

    return NextResponse.json(
      { error: "Unable to submit the lead." },
      { status: 500 }
    );
  }
}