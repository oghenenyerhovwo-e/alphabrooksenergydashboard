import type { Client } from "@microsoft/microsoft-graph-client";
import { CngConfigError, readGraphConfig, getGraphClient } from "./client";
import type { RawPlannerBucket, RawPlannerTask, RawGraphUser } from "@/types/cng";

/** Thrown when a Microsoft Graph call itself fails (network, 4xx/5xx, bad shape). */
export class CngGraphApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngGraphApiError";
  }
}

/**
 * Validates auth config (via client.ts) plus CNG_PLANNER_PLAN_ID together,
 * so a missing-config response names everything missing at once.
 */
function assertCngConfig(): { planId: string } {
  readGraphConfig();

  const planId = process.env.CNG_PLANNER_PLAN_ID;
  if (!planId) {
    throw new CngConfigError("Missing required configuration: CNG_PLANNER_PLAN_ID.");
  }

  return { planId };
}

/**
 * Follows @odata.nextLink until the full result set has been retrieved.
 * Never assumes the first page contains every record.
 */
async function fetchAllPages<T>(client: Client, initialUrl: string): Promise<T[]> {
  const results: T[] = [];
  let url: string | undefined = initialUrl;

  try {
    while (url) {
      const response: { value?: T[]; "@odata.nextLink"?: string } = await client.api(url).get();

      if (Array.isArray(response.value)) {
        results.push(...response.value);
      }

      url = response["@odata.nextLink"];
    }
  } catch (e) {
    console.error("[CNG Graph] pagination failed:", e);
    throw new CngGraphApiError(
      "Failed to retrieve the complete dataset from Microsoft Graph (pagination error)."
    );
  }

  return results;
}

export async function fetchPlannerBuckets(
  client: Client,
  planId: string
): Promise<RawPlannerBucket[]> {
  try {
    return await fetchAllPages<RawPlannerBucket>(client, `/planner/plans/${planId}/buckets`);
  } catch (e) {
    if (e instanceof CngGraphApiError) throw e;
    console.error("[CNG Graph] fetchPlannerBuckets failed:", e);
    throw new CngGraphApiError("Failed to retrieve Planner buckets from Microsoft Graph.");
  }
}

export async function fetchPlannerTasks(
  client: Client,
  planId: string
): Promise<RawPlannerTask[]> {
  try {
    const raw = await fetchAllPages<Record<string, unknown>>(
      client,
      `/planner/plans/${planId}/tasks`
    );

    return raw.map((t) => ({
      id: t.id as string,
      title: (t.title as string) ?? "(Untitled task)",
      bucketId: t.bucketId as string,
      percentComplete: (t.percentComplete as number) ?? 0,
      priority: t.priority as number | undefined,
      startDateTime: t.startDateTime as string | undefined,
      dueDateTime: t.dueDateTime as string | undefined,
      completedDateTime: t.completedDateTime as string | undefined,
      assignments: (t.assignments as Record<string, unknown>) ?? {},
    }));
  } catch (e) {
    if (e instanceof CngGraphApiError) throw e;
    console.error("[CNG Graph] fetchPlannerTasks failed:", e);
    throw new CngGraphApiError("Failed to retrieve Planner tasks from Microsoft Graph.");
  }
}

/**
 * Fetches display info for a set of Graph user IDs using $batch, so we
 * only look up users who actually appear in task assignments — not the
 * whole tenant directory. Graph batch requests cap at 20 sub-requests.
 */
export async function fetchGraphUsersByIds(
  client: Client,
  userIds: string[]
): Promise<RawGraphUser[]> {
  const uniqueIds = Array.from(new Set(userIds)).filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const BATCH_SIZE = 20;
  const results: RawGraphUser[] = [];

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const chunk = uniqueIds.slice(i, i + BATCH_SIZE);

    const batchBody = {
      requests: chunk.map((id) => ({
        id,
        method: "GET",
        url: `/users/${id}?$select=id,displayName`,
      })),
    };

    try {
      const batchResponse: {
        responses: {
          id: string;
          status: number;
          body?: { id: string; displayName?: string };
        }[];
      } = await client.api("/$batch").post(batchBody);

      for (const r of batchResponse.responses) {
        if (r.status === 200 && r.body) {
          results.push({ id: r.body.id, displayName: r.body.displayName ?? "" });
        }
        // Non-200 (e.g. user left the org) is skipped rather than failing
        // the whole request — normalize.ts falls back to "Unmapped User".
      }
    } catch (e) {
      console.error("[CNG Graph] fetchGraphUsersByIds batch failed:", e);
      throw new CngGraphApiError("Failed to resolve assigned users from Microsoft Graph.");
    }
  }

  return results;
}

export interface RawCngPlannerData {
  buckets: RawPlannerBucket[];
  tasks: RawPlannerTask[];
  users: RawGraphUser[];
}

/**
 * Orchestrates the full Planner data pull: buckets + tasks in parallel,
 * then resolves only the users who actually appear as assignees.
 */
export async function fetchCngPlannerData(): Promise<RawCngPlannerData> {
  const { planId } = assertCngConfig();
  const client = getGraphClient();

  const [buckets, tasks] = await Promise.all([
    fetchPlannerBuckets(client, planId),
    fetchPlannerTasks(client, planId),
  ]);

  const assigneeIds = new Set<string>();
  for (const task of tasks) {
    if (task.assignments) {
      for (const userId of Object.keys(task.assignments)) {
        assigneeIds.add(userId);
      }
    }
  }

  const users = await fetchGraphUsersByIds(client, Array.from(assigneeIds));

  return { buckets, tasks, users };
}