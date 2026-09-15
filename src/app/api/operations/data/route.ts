import { NextResponse } from "next/server";
import {
  getOperationsTeamData,
} from "@/lib/operations/team-data";
import {
  CngConfigError,
  CngAuthError,
} from "@/lib/graph/client";
import {
  CngGraphApiError,
} from "@/lib/graph/planner";
import {
  OperationsNormalizationError,
} from "@/lib/operations/team-data";
import {
  getCurrentUser,
} from "@/lib/auth/session";
import type {
  OperationsTeamData,
} from "@/types/operations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function emptyResponse(
  status: OperationsTeamData["status"],
  message?: string
): OperationsTeamData {
  return {
    status,

    message,

    lastUpdated: null,

    buckets: [],
    users: [],
    tasks: [],

    employees: [],
    unassignedTasks: [],

    overall: {
      totalUniqueTasks: 0,
      completedUniqueTasks: 0,
      completionPercentage: null,
    },
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const data = await getOperationsTeamData();

    return NextResponse.json(
      data,
      { status: 200 }
    );
  } catch (e) {
    if (e instanceof CngConfigError) {
      return NextResponse.json(
        emptyResponse(
          "not_connected",
          e.message
        ),
        { status: 200 }
      );
    }

    if (e instanceof CngAuthError) {
      return NextResponse.json(
        emptyResponse(
          "error",
          e.message
        ),
        { status: 200 }
      );
    }

    if (e instanceof CngGraphApiError) {
      return NextResponse.json(
        emptyResponse(
          "error",
          e.message
        ),
        { status: 200 }
      );
    }

    if (
      e instanceof OperationsNormalizationError
    ) {
      return NextResponse.json(
        emptyResponse(
          "error",
          e.message
        ),
        { status: 200 }
      );
    }

    console.error(
      "[Operations Data API] unexpected error:",
      e
    );

    return NextResponse.json(
      emptyResponse(
        "error",
        "An unexpected server error occurred."
      ),
      { status: 500 }
    );
  }
}