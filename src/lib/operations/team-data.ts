/**
 * MAIN OPERATIONS — NORMALIZED PLANNER DATA
 *
 * Main Operations has its own Microsoft Planner plan.
 *
 * Architecture:
 *
 * Microsoft Planner
 *       ↓
 * fetchPlannerTasks()
 * fetchPlannerBuckets()
 * fetchGraphUsersByIds()
 *       ↓
 * normalize (buckets get shortName/group from OPERATIONS_BUCKET_CONFIG,
 *            tasks carry a full bucket object, assignees carry role)
 *       ↓
 * OperationsTeamData
 *       ↓
 * /api/operations/data
 *       ↓
 * OperationsDataProvider
 *       ↓
 * Main Operations components
 *
 * This deliberately mirrors the CNG architecture (src/lib/cng/normalize.ts)
 * while keeping Main Operations completely separate from CNG business logic.
 * Buckets and users are resolved the same way CNG resolves them — there is
 * no separate "department" lookup anywhere in this file.
 */

import { getGraphClient, CngConfigError } from "@/lib/graph/client";
import {
  fetchPlannerTasks,
  fetchPlannerBuckets,
  fetchGraphUsersByIds,
  fetchPlannerTaskDetailsBatch,
} from "@/lib/graph/planner";
import { resolveUserName, resolveUserRole } from "@/config/users";
import { OPERATIONS_BUCKET_CONFIG } from "@/config/buckets";
import { extractBlockers, parseNoteSections } from "./notes";

import type {
  RawPlannerTask,
  RawPlannerBucket,
  RawGraphUser,
} from "@/types/cng";

import type {
  OperationsTask,
  OperationsTaskStatus,
  OperationsEmployeeSummary,
  OperationsOverallSummary,
  OperationsTeamData,
  OperationsConnectionStatus,
  OperationsBucket,
  OperationsUser,
} from "@/types/operations";

/* ============================================================
   ERRORS
   ============================================================ */

export class OperationsNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationsNormalizationError";
  }
}

/* ============================================================
   PLAN CONFIGURATION
   ============================================================ */

/**
 * Main Operations has its OWN Planner plan.
 *
 * Do not fall back to CNG_PLANNER_PLAN_ID.
 *
 * CNG and Main Operations are separate Planner plans and therefore must
 * remain separate sources of truth.
 */
function resolveOperationsPlanId(): string {
  const planId = process.env.OPERATIONS_PLANNER_PLAN_ID;

  if (!planId) {
    throw new CngConfigError(
      "Missing required configuration: set OPERATIONS_PLANNER_PLAN_ID for the Main Operations Planner plan."
    );
  }

  return planId;
}

/* ============================================================
   STATUS
   ============================================================ */

function computeStatus(percentComplete: number): OperationsTaskStatus {
  if (percentComplete >= 100) return "completed";
  if (percentComplete > 0) return "in-progress";
  return "not-started";
}

/* ============================================================
   OVERDUE
   ============================================================ */

function computeIsOverdue(
  dueDate: string | undefined,
  status: OperationsTaskStatus,
  nowMs: number
): boolean {
  if (!dueDate || status === "completed") return false;
  const due = Date.parse(dueDate);
  if (Number.isNaN(due)) return false;
  return due < nowMs;
}

/* ============================================================
   RAW DATA
   ============================================================ */

interface RawOperationsPlannerData {
  tasks: RawPlannerTask[];
  buckets: RawPlannerBucket[];
  users: RawGraphUser[];
  taskNotesById: Map<string, string | undefined>;
}

/**
 * Fetches the complete Main Operations Planner dataset.
 *
 * This is the Main Operations equivalent of fetchCngPlannerData().
 */
async function fetchRawOperationsPlannerData(): Promise<RawOperationsPlannerData> {
  const planId = resolveOperationsPlanId();
  const client = getGraphClient();

  const [tasks, buckets] = await Promise.all([
    fetchPlannerTasks(client, planId),
    fetchPlannerBuckets(client, planId),
  ]);

  const assigneeIds = new Set<string>();

  for (const task of tasks) {
    if (!task.assignments) continue;
    for (const userId of Object.keys(task.assignments)) {
      assigneeIds.add(userId);
    }
  }

  const users = await fetchGraphUsersByIds(client, Array.from(assigneeIds));

  const taskIds = tasks.map((task) => task.id);
  const details = await fetchPlannerTaskDetailsBatch(client, taskIds);

  const taskNotesById = new Map(
    details.map((detail) => [detail.id, detail.description])
  );

  return { tasks, buckets, users, taskNotesById };
}

/* ============================================================
   NORMALIZE BUCKETS
   ============================================================ */

/**
 * Builds an OperationsBucket straight from the live Graph bucket — id,
 * name, and orderHint all come from the API. OPERATIONS_BUCKET_CONFIG
 * only ever adds an optional shortName/group (the "role" label); it
 * never filters or invents buckets. Mirrors CNG's normalizeBucket
 * exactly.
 */
function normalizeBucket(raw: RawPlannerBucket): OperationsBucket {
  const config = OPERATIONS_BUCKET_CONFIG[raw.id];
  return {
    id: raw.id,
    name: raw.name,
    orderHint: raw.orderHint,
    shortName: config?.shortName,
    group: config?.group,
  };
}

/* ============================================================
   NORMALIZE USERS
   ============================================================ */

function normalizeUser(
  userId: string,
  graphUsersById: Map<string, RawGraphUser>
): OperationsUser {
  const graphUser = graphUsersById.get(userId);
  const { name, isUnmapped } = resolveUserName(userId, graphUser?.displayName);
  const role = resolveUserRole(userId);

  return {
    id: userId,
    name,
    role,
    isUnmapped: isUnmapped || undefined,
  };
}

/* ============================================================
   NORMALIZE TASK
   ============================================================ */

function normalizeOperationsTask(
  raw: RawPlannerTask,
  bucketsById: Map<string, OperationsBucket>,
  graphUsersById: Map<string, RawGraphUser>,
  notes: string | undefined,
  nowMs: number
): OperationsTask {
  const status = computeStatus(raw.percentComplete ?? 0);

  const assigneeIds = raw.assignments ? Object.keys(raw.assignments) : [];

  const assignees = assigneeIds.map((id) => {
    const user = normalizeUser(id, graphUsersById);
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      isUnmapped: user.isUnmapped,
    };
  });

  const bucket = bucketsById.get(raw.bucketId);

  return {
    id: raw.id,
    title: raw.title || "(Untitled task)",

    assignees,

    startDate: raw.startDateTime,
    dueDate: raw.dueDateTime,
    completedDate: raw.completedDateTime,

    priority: raw.priority,

    percentComplete: raw.percentComplete ?? 0,

    status,

    isOverdue: computeIsOverdue(raw.dueDateTime, status, nowMs),

    /**
     * The full normalized bucket, straight from the Main Operations
     * Planner plan — id/name from Graph, shortName/group from
     * OPERATIONS_BUCKET_CONFIG. This is what the Team Tracker groups by.
     */
    bucket: bucket
      ? {
          id: bucket.id,
          name: bucket.name,
          shortName: bucket.shortName,
          group: bucket.group,
        }
      : { id: raw.bucketId, name: "Unknown Bucket" },

    notes: notes ?? null,
    noteSections: parseNoteSections(notes),
    blockers: extractBlockers(notes),
  };
}

/* ============================================================
   EMPLOYEE SUMMARY
   ============================================================ */

function summarizeEmployeeTasks(
  userId: string,
  name: string,
  role: string | undefined,
  tasks: OperationsTask[]
): OperationsEmployeeSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress").length;
  const pendingTasks = tasks.filter((task) => task.status === "not-started").length;
  const overdueTasks = tasks.filter((task) => task.isOverdue);

  const blockers = tasks.flatMap((task) =>
    task.blockers.map((text) => ({ taskTitle: task.title, text }))
  );

  return {
    userId,
    name,
    role,

    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,

    completionPercentage:
      totalTasks === 0 ? null : Math.round((completedTasks / totalTasks) * 100),

    overdueTasks,
    blockers,
    tasks,
  };
}

/* ============================================================
   BUILD NORMALIZED MAIN OPERATIONS DATA
   ============================================================ */

export function buildOperationsTeamData(
  raw: {
    tasks: RawPlannerTask[];
    buckets: RawPlannerBucket[];
    users: RawGraphUser[];
    taskNotesById: Map<string, string | undefined>;
  },
  now: Date = new Date()
): Omit<OperationsTeamData, "status" | "message"> {
  try {
    const nowMs = now.getTime();

    const graphUsersById = new Map(raw.users.map((user) => [user.id, user]));

    /**
     * Normalize EVERY bucket returned by Graph. No hardcoded bucket
     * list, no filtering, no invented bucket IDs — same rule CNG follows.
     */
    const buckets: OperationsBucket[] = raw.buckets
      .map(normalizeBucket)
      .sort((a, b) => {
        const orderA = Number(a.orderHint);
        const orderB = Number(b.orderHint);

        if (Number.isFinite(orderA) && Number.isFinite(orderB) && orderA !== orderB) {
          return orderA - orderB;
        }

        return a.name.localeCompare(b.name);
      });

    const bucketsById = new Map(buckets.map((bucket) => [bucket.id, bucket]));

    /**
     * Normalize EVERY Graph user that was resolved from Planner
     * assignments. This is the single roster the rest of the app reads
     * from — the Team Tracker's employee/assignee list comes from here,
     * not from a separate table.
     */
    const users: OperationsUser[] = Array.from(new Set(raw.users.map((user) => user.id)))
      .map((userId) => normalizeUser(userId, graphUsersById))
      .sort((a, b) => a.name.localeCompare(b.name));

    const usersById = new Map(users.map((user) => [user.id, user]));

    /**
     * Normalize EVERY Planner task.
     */
    const tasks = raw.tasks.map((task) =>
      normalizeOperationsTask(
        task,
        bucketsById,
        graphUsersById,
        raw.taskNotesById.get(task.id),
        nowMs
      )
    );

    /* --------------------------------------------------------
       EMPLOYEE ROSTER — built from the normalized `users` list,
       not re-derived from task titles/names a second time.
       -------------------------------------------------------- */

    const assignedUserIds = new Set<string>();
    for (const task of tasks) {
      for (const assignee of task.assignees) assignedUserIds.add(assignee.id);
    }

    const employees: OperationsEmployeeSummary[] = Array.from(assignedUserIds)
      .map((userId) => {
        const user = usersById.get(userId);
        const employeeTasks = tasks.filter((task) =>
          task.assignees.some((assignee) => assignee.id === userId)
        );

        return summarizeEmployeeTasks(
          userId,
          user?.name ?? "Unmapped User",
          user?.role,
          employeeTasks
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    /* --------------------------------------------------------
       UNASSIGNED
       -------------------------------------------------------- */

    const unassignedTasks = tasks.filter((task) => task.assignees.length === 0);

    /* --------------------------------------------------------
       OVERALL
       -------------------------------------------------------- */

    const totalUniqueTasks = tasks.length;
    const completedUniqueTasks = tasks.filter((task) => task.status === "completed").length;

    const overall: OperationsOverallSummary = {
      totalUniqueTasks,
      completedUniqueTasks,
      completionPercentage:
        totalUniqueTasks === 0
          ? null
          : Math.round((completedUniqueTasks / totalUniqueTasks) * 100),
    };

    return {
      lastUpdated: new Date().toISOString(),
      buckets,
      users,
      tasks,
      employees,
      unassignedTasks,
      overall,
    };
  } catch (e) {
    console.error("[Operations Team Data] normalization failed:", e);
    throw new OperationsNormalizationError(
      "Failed to build Main Operations normalized data from Planner."
    );
  }
}

/* ============================================================
   PUBLIC ENTRY POINT
   ============================================================ */

/**
 * Retrieves and normalizes the Main Operations Planner plan.
 *
 * This is the Main Operations equivalent of the CNG data pipeline.
 */
export async function getOperationsTeamData(): Promise<OperationsTeamData> {
  try {
    const raw = await fetchRawOperationsPlannerData();
    const data = buildOperationsTeamData(raw);

    return {
      status: "connected",
      ...data,
    };
  } catch (e) {
    const status: OperationsConnectionStatus =
      e instanceof CngConfigError ? "not_connected" : "error";

    const message =
      e instanceof Error ? e.message : "Unexpected error retrieving Main Operations Planner data.";

    console.error("[Operations Team Data] getOperationsTeamData failed:", e);

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
}