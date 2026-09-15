/**
 * MAIN OPERATIONS — DAILY TEAM REPORT DATA LAYER (Phase 2)
 *
 * Deterministic Planner -> Daily Team Data pipeline. No AI involved here —
 * every count, percentage, and blocker below is computed by plain code.
 * This file is intentionally independent of src/lib/cng/** — it never
 * imports CNG business logic (buckets, phases, readiness), only the
 * shared Graph/Planner technical infrastructure.
 */

import { getGraphClient, CngConfigError } from "@/lib/graph/client";
import {
  fetchPlannerTasks,
  fetchGraphUsersByIds,
  fetchPlannerTaskDetailsBatch,
} from "@/lib/graph/planner";
import type { RawPlannerTask, RawGraphUser } from "@/types/cng";
import type {
  OperationsTask,
  OperationsTaskStatus,
  OperationsEmployeeSummary,
  OperationsOverallSummary,
  OperationsTeamData,
  OperationsConnectionStatus,
} from "@/types/operations";

/** Thrown when raw Planner/Graph data can't be turned into Daily Team Data. */
export class OperationsNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationsNormalizationError";
  }
}

/**
 * Which Planner plan the Daily Team Report reads from.
 *
 * Reuses CNG_PLANNER_PLAN_ID by default so Phase 2 doesn't force a second
 * Planner configuration just to exist. Set OPERATIONS_PLANNER_PLAN_ID
 * explicitly once Main Operations should read from a different plan than
 * CNG — until then both features point at the same plan with no config
 * change required.
 */
function resolveOperationsPlanId(): string {
  const planId = process.env.OPERATIONS_PLANNER_PLAN_ID || process.env.CNG_PLANNER_PLAN_ID;
  if (!planId) {
    throw new CngConfigError(
      "Missing required configuration: set OPERATIONS_PLANNER_PLAN_ID (or CNG_PLANNER_PLAN_ID as a shared fallback)."
    );
  }
  return planId;
}

/* ============================================================
   STATUS / OVERDUE — deterministic, no AI
   ============================================================ */

function computeStatus(percentComplete: number): OperationsTaskStatus {
  if (percentComplete >= 100) return "completed";
  if (percentComplete > 0) return "in-progress";
  return "not-started";
}

/** Raw ISO-8601 UTC timestamp comparison — never local browser/server time. A completed task is never overdue. */
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
   BLOCKER EXTRACTION — deterministic, no AI
   ============================================================ */

/**
 * A blocker is any line in the task Notes/Description whose trimmed text
 * starts with "BLOCKER:" (case-insensitive). Everything after the prefix,
 * trimmed, is kept as the blocker text. Lines like "UPDATE:" or "NEXT:"
 * are never treated as blockers.
 */
const BLOCKER_PREFIX = /^blocker:\s*/i;

export function extractBlockers(notes: string | null | undefined): string[] {
  if (!notes) return [];

  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => BLOCKER_PREFIX.test(line))
    .map((line) => line.replace(BLOCKER_PREFIX, "").trim())
    .filter((text) => text.length > 0);
}

/* ============================================================
   RAW GRAPH FETCH
   ============================================================ */

interface RawOperationsPlannerData {
  tasks: RawPlannerTask[];
  users: RawGraphUser[];
  taskNotesById: Map<string, string | undefined>;
}

/**
 * Pulls the full Planner task list (all pages, via the existing shared
 * pagination), resolves only the assignees that actually appear, and
 * fetches task details/Notes for every task via the batched Graph
 * endpoint (20 requests per $batch call) — not one request per task.
 * Buckets are not needed for the Daily Team Report and are intentionally
 * not fetched here.
 */
async function fetchRawOperationsPlannerData(): Promise<RawOperationsPlannerData> {
  const planId = resolveOperationsPlanId();
  const client = getGraphClient();

  const tasks = await fetchPlannerTasks(client, planId);

  const assigneeIds = new Set<string>();
  for (const task of tasks) {
    if (task.assignments) {
      for (const userId of Object.keys(task.assignments)) {
        assigneeIds.add(userId);
      }
    }
  }
  const users = await fetchGraphUsersByIds(client, Array.from(assigneeIds));

  const taskIds = tasks.map((t) => t.id);
  const details = await fetchPlannerTaskDetailsBatch(client, taskIds);
  const taskNotesById = new Map(details.map((d) => [d.id, d.description]));

  return { tasks, users, taskNotesById };
}

/* ============================================================
   NORMALIZATION — Raw Graph -> OperationsTask
   ============================================================ */

function normalizeOperationsTask(
  raw: RawPlannerTask,
  graphUsersById: Map<string, RawGraphUser>,
  notes: string | undefined,
  nowMs: number
): OperationsTask {
  const status = computeStatus(raw.percentComplete ?? 0);
  const assigneeIds = raw.assignments ? Object.keys(raw.assignments) : [];

  const assignees = assigneeIds.map((id) => {
    const graphUser = graphUsersById.get(id);
    return { id, name: graphUser?.displayName || "Unmapped User" };
  });

  return {
    id: raw.id,
    title: raw.title || "(Untitled task)",
    assignees,
    dueDate: raw.dueDateTime,
    priority: raw.priority,
    percentComplete: raw.percentComplete ?? 0,
    status,
    isOverdue: computeIsOverdue(raw.dueDateTime, status, nowMs),
    notes: notes ?? null,
    blockers: extractBlockers(notes),
  };
}

/* ============================================================
   EMPLOYEE GROUPING + AGGREGATION
   ============================================================ */

function summarizeEmployeeTasks(
  userId: string,
  name: string,
  tasks: OperationsTask[]
): OperationsEmployeeSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const pendingTasks = tasks.filter((t) => t.status === "not-started").length;
  const overdueTasks = tasks.filter((t) => t.isOverdue);

  const blockers = tasks.flatMap((t) => t.blockers.map((text) => ({ taskTitle: t.title, text })));

  return {
    userId,
    name,
    totalTasks,
    completedTasks,
    inProgressTasks,
    pendingTasks,
    // null (never 0) when the employee has no assigned tasks — "No tasks assigned yet."
    completionPercentage: totalTasks === 0 ? null : Math.round((completedTasks / totalTasks) * 100),
    overdueTasks,
    blockers,
    tasks,
  };
}

/* ============================================================
   TOP-LEVEL: RAW GRAPH DATA -> DAILY TEAM DATA
   ============================================================ */

export function buildOperationsTeamData(
  raw: { tasks: RawPlannerTask[]; users: RawGraphUser[]; taskNotesById: Map<string, string | undefined> },
  now: Date = new Date()
): Omit<OperationsTeamData, "status" | "message"> {
  try {
    const nowMs = now.getTime();
    const graphUsersById = new Map(raw.users.map((u) => [u.id, u]));

    const tasks = raw.tasks.map((t) =>
      normalizeOperationsTask(t, graphUsersById, raw.taskNotesById.get(t.id), nowMs)
    );

    // Employee roster = every distinct assignee that actually appears on a
    // task — no invented employees, nobody who isn't in Planner.
    const employeeNamesById = new Map<string, string>();
    for (const task of tasks) {
      for (const assignee of task.assignees) {
        if (!employeeNamesById.has(assignee.id)) {
          employeeNamesById.set(assignee.id, assignee.name);
        }
      }
    }

    const employees: OperationsEmployeeSummary[] = Array.from(employeeNamesById.entries())
      .map(([userId, name]) => {
        const employeeTasks = tasks.filter((t) => t.assignees.some((a) => a.id === userId));
        return summarizeEmployeeTasks(userId, name, employeeTasks);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const unassignedTasks = tasks.filter((t) => t.assignees.length === 0);

    // Overall completion is computed over unique Planner tasks — a task
    // assigned to more than one person is counted once here even though
    // it appears in each of those employees' individual `tasks` arrays.
    const totalUniqueTasks = tasks.length;
    const completedUniqueTasks = tasks.filter((t) => t.status === "completed").length;

    const overall: OperationsOverallSummary = {
      totalUniqueTasks,
      completedUniqueTasks,
      completionPercentage:
        totalUniqueTasks === 0 ? null : Math.round((completedUniqueTasks / totalUniqueTasks) * 100),
    };

    return {
      lastUpdated: new Date().toISOString(),
      employees,
      unassignedTasks,
      overall,
    };
  } catch (e) {
    console.error("[Operations Team Data] normalization failed:", e);
    throw new OperationsNormalizationError("Failed to build Daily Team Data from Planner data.");
  }
}

/* ============================================================
   PUBLIC ENTRY POINT
   ============================================================ */

/**
 * Fetches live Planner data and returns fully normalized Daily Team Data.
 * Mirrors the existing fetchCngPlannerData() + normalizeCngData() shape,
 * but reads only what the Daily Team Report needs (no buckets) and adds
 * task Notes/blocker extraction on top.
 *
 * On any failure, returns a connection-status result rather than throwing
 * past this boundary — same convention as the existing CNG API route —
 * so callers (Phase 3's report builder, a future status check) can render
 * a clear "not connected" / "error" state instead of crashing.
 */
export async function getOperationsTeamData(): Promise<OperationsTeamData> {
  try {
    const raw = await fetchRawOperationsPlannerData();
    const data = buildOperationsTeamData(raw);
    return { status: "connected", ...data };
  } catch (e) {
    const status: OperationsConnectionStatus = e instanceof CngConfigError ? "not_connected" : "error";
    const message = e instanceof Error ? e.message : "Unexpected error retrieving Planner data.";

    console.error("[Operations Team Data] getOperationsTeamData failed:", e);

    return {
      status,
      message,
      lastUpdated: null,
      employees: [],
      unassignedTasks: [],
      overall: { totalUniqueTasks: 0, completedUniqueTasks: 0, completionPercentage: null },
    };
  }
}