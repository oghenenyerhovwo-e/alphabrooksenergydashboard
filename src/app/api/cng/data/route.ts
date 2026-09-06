import { NextResponse } from "next/server";
import { fetchCngPlannerData, CngGraphApiError } from "@/lib/graph/planner";
import { normalizeCngData, CngNormalizationError } from "@/lib/cng/normalize";
import { CngConfigError, CngAuthError } from "@/lib/graph/client";
import type { CngData } from "@/types/cng";

// msal-node requires Node APIs, and this data should never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function emptyResponse(status: CngData["status"], message?: string): CngData {
  return {
    tasks: [],
    buckets: [],
    users: [],
    lastUpdated: null,
    status,
    message,
  };
}

export async function GET() {
  try {
    const raw = await fetchCngPlannerData();
    const normalized = normalizeCngData(raw);

    const body: CngData = {
      tasks: normalized.tasks,
      buckets: normalized.buckets,
      users: normalized.users,
      lastUpdated: new Date().toISOString(),
      status: "connected",
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e) {
    // Known, expected failure states: respond 200 with a clear status/message
    // so the frontend can distinguish them (res.ok stays true either way).
    if (e instanceof CngConfigError) {
      return NextResponse.json(emptyResponse("not_connected", e.message), { status: 200 });
    }

    if (e instanceof CngAuthError) {
      return NextResponse.json(emptyResponse("error", e.message), { status: 200 });
    }

    if (e instanceof CngGraphApiError) {
      return NextResponse.json(emptyResponse("error", e.message), { status: 200 });
    }

    if (e instanceof CngNormalizationError) {
      return NextResponse.json(emptyResponse("error", e.message), { status: 200 });
    }

    // Truly unexpected: log full detail server-side only, never in the response.
    console.error("[CNG API] unexpected error:", e);
    return NextResponse.json(
      emptyResponse("error", "An unexpected server error occurred."),
      { status: 500 }
    );
  }
}