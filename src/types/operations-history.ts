/**
 * MAIN OPERATIONS — HISTORICAL DAILY REPORT SNAPSHOT TYPES (Phase 6)
 *
 * These types describe a *reporting snapshot* — a frozen record of what
 * the Main Operations Daily Team Report contained on one Africa/Lagos
 * calendar date. They are NOT a task-management model: nothing here is
 * ever written back to, and nothing here is authoritative for task
 * state. Microsoft Planner remains the source of truth for tasks.
 *
 * The snapshot deliberately reuses the Phase 2 OperationsTask /
 * OperationsEmployeeSummary shapes rather than defining parallel ones,
 * so there is exactly one Main Operations reporting model in the
 * codebase.
 *
 * There is no separate "department" concept here — grouping by role is
 * done from each task's normalized Planner bucket (task.bucket.group),
 * not from any table outside Planner.
 */

import type {
  OperationsTask,
  OperationsEmployeeSummary,
  OperationsConnectionStatus,
} from "./operations";

/** Bumped only if the stored JSON shape changes incompatibly. Stored rows keep the version they were written with. */
export const OPERATIONS_SNAPSHOT_VERSION = 1;

/** A snapshot's per-employee entry is exactly the Phase 2 employee summary — nothing added, nothing guessed. */
export type OperationsSnapshotEmployee = OperationsEmployeeSummary;

/** Counts over UNIQUE Planner tasks. A multi-assignee task is counted once. */
export interface OperationsSnapshotStatusCounts {
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
}

export interface OperationsSnapshotOverall {
  /** Unique Planner tasks — multi-assignee tasks counted once. */
  totalUniqueTasks: number;
  completedUniqueTasks: number;
  /** null (never 0) when there were no tasks at all on the reporting date. */
  completionPercentage: number | null;
  statusCounts: OperationsSnapshotStatusCounts;
  /** Number of unique tasks carrying at least one BLOCKER: line. */
  blockedTaskCount: number;
  /** Total number of BLOCKER: lines across all unique tasks. */
  blockerCount: number;
}

export interface OperationsDailyReportSnapshot {
  version: number;
  /** Africa/Lagos calendar date, "YYYY-MM-DD". The identity of this report. */
  reportDate: string;
  /** Human label, e.g. "15 September 2026". Stored so it never re-formats differently later. */
  reportDateLabel: string;
  timezone: string;
  /** ISO-8601 UTC instant the snapshot was captured. */
  capturedAt: string;
  connectionStatus: OperationsConnectionStatus;
  employees: OperationsSnapshotEmployee[];
  /** Tasks with zero Planner assignees — preserved, never dropped, never attributed to an employee. */
  unassignedTasks: OperationsTask[];
  overall: OperationsSnapshotOverall;
}

/**
 * Lightweight per-date row for a calendar index — enough to mark which
 * dates have a report and show a headline number, without loading the
 * full JSON tree for every date in the month.
 */
export interface OperationsDailyReportIndexEntry {
  reportDate: string;
  capturedAt: string;
  completionPercentage: number | null;
  totalUniqueTasks: number;
  completedUniqueTasks: number;
  overdueCount: number;
  blockerCount: number;
}

/** Outcome of an attempted snapshot capture. Idempotent by reporting date. */
export type OperationsSnapshotCaptureStatus =
  | "created"
  | "already-exists"
  | "skipped"
  | "failed";

export interface OperationsSnapshotCaptureResult {
  status: OperationsSnapshotCaptureStatus;
  reportDate: string;
  /** Present for "skipped" and "failed" — safe to log, never contains credentials. */
  reason?: string;
}