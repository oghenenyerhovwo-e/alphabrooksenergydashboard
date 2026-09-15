/**
 * MAIN OPERATIONS — HISTORICAL DAILY REPORT SNAPSHOTS (Phase 6)
 *
 * Persists the deterministic Main Operations Daily Team Data for one
 * Africa/Lagos reporting date, and reads it back.
 *
 * This is a REPORTING ARCHIVE, not a task store:
 *   - the only write path is "capture the whole day, once";
 *   - there is no per-task, per-employee or per-status update path;
 *   - nothing here is ever written back to Planner;
 *   - Planner remains the source of truth for all task state.
 *
 * There is no department/role lookup against the login User table here.
 * Role grouping comes entirely from each task's normalized Planner
 * bucket (task.bucket.group), which is resolved once in team-data.ts —
 * the snapshot just stores whatever buildOperationsTeamData() produced.
 *
 * Every number stored here is computed by plain code (team-data.ts +
 * the counters below). The AI provider is never consulted.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { OperationsTeamData, OperationsTask } from "@/types/operations";
import type {
  OperationsDailyReportSnapshot,
  OperationsSnapshotOverall,
  OperationsDailyReportIndexEntry,
  OperationsSnapshotCaptureResult,
} from "@/types/operations-history";
import { OPERATIONS_SNAPSHOT_VERSION } from "@/types/operations-history";
import {
  OPERATIONS_REPORT_TIMEZONE,
  getLagosReportDate,
  formatReportDateLabel,
  isValidReportDate,
} from "./report-date";

/* ============================================================
   SNAPSHOT CONSTRUCTION — deterministic, no AI, pure
   ============================================================ */

/**
 * Collapses employees' task lists plus unassigned tasks into the set of
 * UNIQUE Planner tasks. A task assigned to John and Mary appears in both
 * employees' arrays but is a single entry here — this is what keeps
 * overall team statistics from double-counting.
 */
function collectUniqueTasks(data: OperationsTeamData): OperationsTask[] {
  const byId = new Map<string, OperationsTask>();

  for (const employee of data.employees) {
    for (const task of employee.tasks) byId.set(task.id, task);
  }
  for (const task of data.unassignedTasks) byId.set(task.id, task);

  return Array.from(byId.values());
}

function buildOverall(data: OperationsTeamData): OperationsSnapshotOverall {
  const uniqueTasks = collectUniqueTasks(data);

  const statusCounts = {
    completed: uniqueTasks.filter((t) => t.status === "completed").length,
    inProgress: uniqueTasks.filter((t) => t.status === "in-progress").length,
    pending: uniqueTasks.filter((t) => t.status === "not-started").length,
    overdue: uniqueTasks.filter((t) => t.isOverdue).length,
  };

  const blockedTaskCount = uniqueTasks.filter((t) => t.blockers.length > 0).length;
  const blockerCount = uniqueTasks.reduce((sum, t) => sum + t.blockers.length, 0);

  return {
    // team-data.ts's overall figures are authoritative and already
    // computed over unique tasks — they are preserved, not recalculated.
    totalUniqueTasks: data.overall.totalUniqueTasks,
    completedUniqueTasks: data.overall.completedUniqueTasks,
    completionPercentage: data.overall.completionPercentage,
    statusCounts,
    blockedTaskCount,
    blockerCount,
  };
}

/**
 * Builds the snapshot document. Pure and synchronous: given the same
 * team data and instant, it always produces the same output. Safe to
 * unit-test without a database.
 */
export function buildOperationsDailyReportSnapshot(
  data: OperationsTeamData,
  now: Date = new Date()
): OperationsDailyReportSnapshot {
  const reportDate = getLagosReportDate(now);

  return {
    version: OPERATIONS_SNAPSHOT_VERSION,
    reportDate,
    reportDateLabel: formatReportDateLabel(reportDate),
    timezone: OPERATIONS_REPORT_TIMEZONE,
    capturedAt: now.toISOString(),
    connectionStatus: data.status,
    employees: data.employees,
    unassignedTasks: data.unassignedTasks,
    overall: buildOverall(data),
  };
}

/* ============================================================
   PERSISTENCE — create-only
   ============================================================ */

/** Prisma's unique-constraint violation, duck-typed so we don't depend on the error class's import path. */
function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/**
 * Captures the Main Operations daily report for today's Lagos reporting
 * date.
 *
 * Idempotent: a reporting date that already has a snapshot is left
 * untouched and reported as "already-exists". This is what makes a
 * historical report immutable — a second cron run, a manual POST, or a
 * redeploy on the same day can never rewrite the morning's record.
 *
 * Only captures when Planner was actually reachable. A failed Graph call
 * must not write an empty row that permanently claims that date.
 *
 * Never throws: the daily email must not fail because the archive did.
 */
export async function captureOperationsDailyReportSnapshot(
  data: OperationsTeamData,
  options: { now?: Date; force?: boolean } = {}
): Promise<OperationsSnapshotCaptureResult> {
  const now = options.now ?? new Date();
  const reportDate = getLagosReportDate(now);

  if (data.status !== "connected") {
    return {
      status: "skipped",
      reportDate,
      reason: `Planner connection status was "${data.status}" — no snapshot written for this date.`,
    };
  }

  try {
    const existing = await prisma.operationsDailyReport.findUnique({
      where: { reportDate },
      select: { id: true },
    });

    if (existing && !options.force) {
      console.log(`[Operations Snapshot] ${reportDate} already captured — left unchanged.`);
      return { status: "already-exists", reportDate };
    }

    const snapshot = buildOperationsDailyReportSnapshot(data, now);

    const row = {
      reportDate: snapshot.reportDate,
      timezone: snapshot.timezone,
      capturedAt: new Date(snapshot.capturedAt),
      connectionStatus: snapshot.connectionStatus,
      totalUniqueTasks: snapshot.overall.totalUniqueTasks,
      completedUniqueTasks: snapshot.overall.completedUniqueTasks,
      completionPercentage: snapshot.overall.completionPercentage,
      completedCount: snapshot.overall.statusCounts.completed,
      inProgressCount: snapshot.overall.statusCounts.inProgress,
      pendingCount: snapshot.overall.statusCounts.pending,
      overdueCount: snapshot.overall.statusCounts.overdue,
      blockerCount: snapshot.overall.blockerCount,
      snapshot: snapshot as unknown as Prisma.InputJsonValue,
    };

    if (existing && options.force) {
      // Explicit administrative regeneration only. Nothing in Phase 6
      // passes force: true, and there is no UI for it.
      await prisma.operationsDailyReport.update({ where: { reportDate }, data: row });
      console.log(`[Operations Snapshot] ${reportDate} regenerated (explicit force).`);
      return { status: "created", reportDate };
    }

    await prisma.operationsDailyReport.create({ data: row });
    console.log(
      `[Operations Snapshot] ${reportDate} captured: employees=${snapshot.employees.length} uniqueTasks=${snapshot.overall.totalUniqueTasks} completion=${snapshot.overall.completionPercentage}`
    );
    return { status: "created", reportDate };
  } catch (e) {
    if (isUniqueViolation(e)) {
      // Two invocations raced. The first one's record stands.
      console.log(`[Operations Snapshot] ${reportDate} captured concurrently — existing record kept.`);
      return { status: "already-exists", reportDate };
    }

    console.error("[Operations Snapshot] capture failed:", e);
    return {
      status: "failed",
      reportDate,
      reason: "Failed to persist the historical daily report snapshot.",
    };
  }
}

/* ============================================================
   RETRIEVAL
   ============================================================ */

/**
 * Reads the stored snapshot for a reporting date. Returns exactly what
 * was recorded that day — it never recalculates from current Planner
 * state, which is the entire reason Phase 6 exists.
 */
export async function getOperationsDailyReportSnapshot(
  reportDate: string
): Promise<OperationsDailyReportSnapshot | null> {
  if (!isValidReportDate(reportDate)) return null;

  const row = await prisma.operationsDailyReport.findUnique({
    where: { reportDate },
    select: { snapshot: true },
  });

  if (!row) return null;

  return row.snapshot as unknown as OperationsDailyReportSnapshot;
}

/**
 * Lists which reporting dates have a stored snapshot, with headline
 * numbers only — the JSON tree is deliberately not loaded here so a
 * calendar month can be indexed cheaply.
 */
export async function listOperationsDailyReportDates(range: {
  from: string;
  to: string;
}): Promise<OperationsDailyReportIndexEntry[]> {
  if (!isValidReportDate(range.from) || !isValidReportDate(range.to)) return [];

  const rows = await prisma.operationsDailyReport.findMany({
    where: { reportDate: { gte: range.from, lte: range.to } },
    orderBy: { reportDate: "asc" },
    select: {
      reportDate: true,
      capturedAt: true,
      completionPercentage: true,
      totalUniqueTasks: true,
      completedUniqueTasks: true,
      overdueCount: true,
      blockerCount: true,
    },
  });

  return rows.map((row) => ({
    reportDate: row.reportDate,
    capturedAt: row.capturedAt.toISOString(),
    completionPercentage: row.completionPercentage,
    totalUniqueTasks: row.totalUniqueTasks,
    completedUniqueTasks: row.completedUniqueTasks,
    overdueCount: row.overdueCount,
    blockerCount: row.blockerCount,
  }));
}