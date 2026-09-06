/**
 * PHASE 8A — CNG INTELLIGENCE ENGINE
 *
 * Pure, deterministic calculation module. No React, no hooks, no
 * fetching, no browser APIs, no environment access, no mutation.
 *
 * This module sits ABOVE the existing normalized Planner pipeline:
 *
 *   Planner -> Graph -> normalize.ts -> CngDataContext -> (this file)
 *
 * It does not read, replace, or duplicate normalize.ts or
 * calculations.ts. Where a deterministic rule already exists in
 * calculations.ts (date-based deadline classification), this module
 * imports and reuses it directly rather than re-implementing calendar
 * math a second time.
 *
 * IMPORTANT — READINESS PHASES VS PLANNER BUCKETS:
 * The project currently has NO bucket -> readiness-phase mapping
 * anywhere in config (`config/buckets.ts` only carries optional
 * cosmetic `shortName`/`group` metadata, same as calculations.ts's
 * own phase logic already treats "phase" as 1:1 with a live Planner
 * bucket). Per the spec for this phase, this module does not invent
 * such a mapping. All bucket-level output below refers to actual
 * Planner buckets, using their real names.
 */

import type { CngTask } from "@/types/cng";
import { getDeadlineCategory } from "@/lib/cng/calculations";

/* ============================================================
   SIGNAL / SEVERITY VOCABULARY
   ============================================================ */

export type CngIntelligenceSignalType =
  | "OVERDUE_WORK"
  | "DEADLINE_EXPOSURE"
  | "HIGH_PRIORITY_EXPOSURE"
  | "UNASSIGNED_WORK"
  | "MISSING_DUE_DATES"
  | "BUCKET_CONCENTRATION"
  | "WORKLOAD_CONCENTRATION"
  | "EXECUTION_BACKLOG";

export type CngIntelligenceSeverity =
  | "CRITICAL"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "INFORMATION";

export interface CngIntelligenceSignal {
  id: string;
  type: CngIntelligenceSignalType;
  severity: CngIntelligenceSeverity;
  title: string;
  description: string;
  evidence: string;
  affectedTaskCount: number;
  affectedTaskIds: string[];
  affectedTaskTitles: string[];
  recommendation: string;
}

export interface CngIntelligenceSummary {
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  highPriorityActiveTasks: number;
  unassignedActiveTasks: number;
  activeTasksWithoutDueDate: number;
  totalSignals: number;
}

export interface CngBucketConcentrationEntry {
  bucketId: string;
  bucketName: string;
  activeTaskCount: number;
  /** Rounded percentage of ALL active tasks that sit in this bucket. */
  percentageOfActive: number;
}

export interface CngAssigneeConcentrationEntry {
  userId: string;
  name: string;
  role?: string;
  activeTaskCount: number;
  /**
   * Rounded percentage of ALL active tasks that include this person as
   * an assignee. Because a multi-assignee task counts toward every one
   * of its assignees (see computeAssigneeConcentration below), these
   * percentages are NOT expected to sum to 100% across all assignees.
   */
  percentageOfActive: number;
}

export interface CngIntelligenceConcentration {
  /** All buckets containing at least one active task, sorted descending. */
  byBucket: CngBucketConcentrationEntry[];
  /** All assignees with at least one active task, sorted descending. */
  byAssignee: CngAssigneeConcentrationEntry[];
}

export interface CngIntelligenceResult {
  summary: CngIntelligenceSummary;
  /** Sorted CRITICAL -> INFORMATION, then by affected task count descending. */
  signals: CngIntelligenceSignal[];
  concentration: CngIntelligenceConcentration;
  /** ISO string of the reference date this calculation was run against. */
  referenceDate: string;
}

/* ============================================================
   SEVERITY THRESHOLDS (spec §10)
   ============================================================
   Each count-based signal's severity is derived from what percentage
   of ACTIVE work it represents — never from subjective judgment and
   never randomized. A signal is only emitted at all when its affected
   count is greater than zero (spec §21 — no data, no signal).

   Concentration signals (bucket / workload) use a different, lower
   "medium" floor: a single bucket or single person holding a large
   slice of ALL active work is inherently more notable at a lower
   percentage than, say, overdue work, because concentration itself
   (not lateness) is the thing being flagged.
   ============================================================ */

interface SeverityThresholds {
  critical: number;
  high: number;
  medium: number;
}

const OVERDUE_THRESHOLDS: SeverityThresholds = { critical: 40, high: 20, medium: 5 };
const DEADLINE_EXPOSURE_THRESHOLDS: SeverityThresholds = { critical: 40, high: 20, medium: 5 };
const HIGH_PRIORITY_THRESHOLDS: SeverityThresholds = { critical: 50, high: 30, medium: 10 };
const UNASSIGNED_THRESHOLDS: SeverityThresholds = { critical: 40, high: 20, medium: 5 };
const MISSING_DUE_DATE_THRESHOLDS: SeverityThresholds = { critical: 50, high: 30, medium: 10 };
const EXECUTION_BACKLOG_THRESHOLDS: SeverityThresholds = { critical: 70, high: 50, medium: 25 };
const BUCKET_CONCENTRATION_THRESHOLDS: SeverityThresholds = { critical: 50, high: 35, medium: 20 };
const WORKLOAD_CONCENTRATION_THRESHOLDS: SeverityThresholds = { critical: 50, high: 35, medium: 20 };

function severityFromPercentage(
  percentage: number,
  thresholds: SeverityThresholds
): CngIntelligenceSeverity {
  if (percentage >= thresholds.critical) return "CRITICAL";
  if (percentage >= thresholds.high) return "HIGH";
  if (percentage >= thresholds.medium) return "MEDIUM";
  return "LOW";
}

/** Never divides by zero; never returns NaN or Infinity (spec §20). */
function safePercentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function pluralTasks(count: number): string {
  return count === 1 ? "task" : "tasks";
}

/* ============================================================
   PRIORITY RULE
   ============================================================
   Mirrors the existing "important" priority band already used
   elsewhere in the app (calculateImportantTasks / getAttentionSignals
   in lib/cng/calculations.ts use the same "urgent"/"important" band).
   This is not a new priority concept — Planner priority is normalized
   once, in normalize.ts, into "urgent" | "important" | "medium" | "low".
   ============================================================ */

const HIGH_PRIORITY_BANDS = new Set(["urgent", "important"]);

function isHighPriorityTask(task: CngTask): boolean {
  return task.priority !== undefined && HIGH_PRIORITY_BANDS.has(task.priority);
}

/* ============================================================
   CONCENTRATION CALCULATIONS
   ============================================================ */

interface BucketConcentrationResult {
  list: CngBucketConcentrationEntry[];
  /** bucketId -> the actual active tasks in that bucket, for signal evidence. */
  tasksByBucket: Map<string, CngTask[]>;
}

/**
 * Groups active tasks by their actual Planner bucket (task.bucket.id /
 * task.bucket.name, exactly as normalize.ts produced them — never
 * renamed, never remapped to a readiness phase).
 */
function computeBucketConcentration(activeTasks: CngTask[]): BucketConcentrationResult {
  const grouped = new Map<string, { bucketId: string; bucketName: string; tasks: CngTask[] }>();

  for (const task of activeTasks) {
    const key = task.bucket.id;
    const existing = grouped.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      grouped.set(key, { bucketId: task.bucket.id, bucketName: task.bucket.name, tasks: [task] });
    }
  }

  const total = activeTasks.length;
  const list: CngBucketConcentrationEntry[] = Array.from(grouped.values())
    .map((entry) => ({
      bucketId: entry.bucketId,
      bucketName: entry.bucketName,
      activeTaskCount: entry.tasks.length,
      percentageOfActive: safePercentage(entry.tasks.length, total),
    }))
    .sort((a, b) => b.activeTaskCount - a.activeTaskCount);

  const tasksByBucket = new Map<string, CngTask[]>();
  for (const entry of grouped.values()) {
    tasksByBucket.set(entry.bucketId, entry.tasks);
  }

  return { list, tasksByBucket };
}

interface AssigneeConcentrationResult {
  list: CngAssigneeConcentrationEntry[];
  /** userId -> the actual active tasks assigned to that person. */
  tasksByAssignee: Map<string, CngTask[]>;
}

/**
 * MULTI-ASSIGNEE RULE (preserved from calculateTeamMemberPerformance
 * in lib/cng/calculations.ts): a task with several assignees
 * contributes to EACH assignee's workload individually. The team-wide
 * active task total used for percentages is still the unique active
 * task count, so per-person percentages can legitimately sum to more
 * than 100% across the roster — that is expected, not a bug.
 *
 * Tasks with zero assignees are intentionally excluded here; they are
 * covered separately by the UNASSIGNED_WORK signal.
 */
function computeAssigneeConcentration(activeTasks: CngTask[]): AssigneeConcentrationResult {
  const grouped = new Map<
    string,
    { userId: string; name: string; role?: string; tasks: CngTask[] }
  >();

  for (const task of activeTasks) {
    for (const assignee of task.assignees) {
      const existing = grouped.get(assignee.id);
      if (existing) {
        existing.tasks.push(task);
      } else {
        grouped.set(assignee.id, {
          userId: assignee.id,
          name: assignee.name,
          role: assignee.role,
          tasks: [task],
        });
      }
    }
  }

  const total = activeTasks.length;
  const list: CngAssigneeConcentrationEntry[] = Array.from(grouped.values())
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      role: entry.role,
      activeTaskCount: entry.tasks.length,
      percentageOfActive: safePercentage(entry.tasks.length, total),
    }))
    .sort((a, b) => b.activeTaskCount - a.activeTaskCount);

  const tasksByAssignee = new Map<string, CngTask[]>();
  for (const entry of grouped.values()) {
    tasksByAssignee.set(entry.userId, entry.tasks);
  }

  return { list, tasksByAssignee };
}

/* ============================================================
   COUNT-BASED SIGNAL BUILDER
   ============================================================
   OVERDUE_WORK, DEADLINE_EXPOSURE, HIGH_PRIORITY_EXPOSURE,
   UNASSIGNED_WORK, MISSING_DUE_DATES and EXECUTION_BACKLOG all share
   the same shape: a count of affected active tasks, a severity derived
   from what percentage of active work that count represents, and a
   fixed list of affected tasks. This shared builder keeps that rule
   in exactly one place instead of six near-duplicates.
   ============================================================ */

interface CountSignalConfig {
  id: string;
  type: CngIntelligenceSignalType;
  activeTotal: number;
  thresholds: SeverityThresholds;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  tasks: CngTask[];
}

function buildCountSignal(config: CountSignalConfig): CngIntelligenceSignal | null {
  if (config.tasks.length === 0) return null;

  const percentage = safePercentage(config.tasks.length, config.activeTotal);
  const severity = severityFromPercentage(percentage, config.thresholds);

  return {
    id: config.id,
    type: config.type,
    severity,
    title: config.title,
    description: config.description,
    evidence: config.evidence,
    affectedTaskCount: config.tasks.length,
    affectedTaskIds: config.tasks.map((t) => t.id),
    affectedTaskTitles: config.tasks.map((t) => t.title),
    recommendation: config.recommendation,
  };
}

/* ============================================================
   CONCENTRATION SIGNAL BUILDERS
   ============================================================
   Unlike the count-based signals, these are only emitted when the
   SINGLE largest bucket / assignee crosses the "medium" floor —
   the concentration table itself (concentration.byBucket /
   concentration.byAssignee) is always returned in full regardless,
   so callers can render the full breakdown even when nothing here
   was severe enough to surface as a standalone signal.
   ============================================================ */

function buildBucketConcentrationSignal(
  byBucket: CngBucketConcentrationEntry[],
  tasksByBucket: Map<string, CngTask[]>,
  activeTotal: number
): CngIntelligenceSignal | null {
  if (byBucket.length === 0) return null;

  const top = byBucket[0];
  if (top.percentageOfActive < BUCKET_CONCENTRATION_THRESHOLDS.medium) return null;

  const severity = severityFromPercentage(top.percentageOfActive, BUCKET_CONCENTRATION_THRESHOLDS);
  const tasks = tasksByBucket.get(top.bucketId) ?? [];

  return {
    id: `bucket-concentration:${top.bucketId}`,
    type: "BUCKET_CONCENTRATION",
    severity,
    title: `Active workload is concentrated in "${top.bucketName}"`,
    description: `"${top.bucketName}" currently holds the largest share of active work of any Planner bucket.`,
    evidence: `${top.activeTaskCount} of ${activeTotal} active ${pluralTasks(
      top.activeTaskCount
    )} (${top.percentageOfActive}%) are in the "${top.bucketName}" bucket.`,
    affectedTaskCount: tasks.length,
    affectedTaskIds: tasks.map((t) => t.id),
    affectedTaskTitles: tasks.map((t) => t.title),
    recommendation: `Review capacity and progress in "${top.bucketName}" given its share of current active work.`,
  };
}

function buildWorkloadConcentrationSignal(
  byAssignee: CngAssigneeConcentrationEntry[],
  tasksByAssignee: Map<string, CngTask[]>,
  activeTotal: number
): CngIntelligenceSignal | null {
  if (byAssignee.length === 0) return null;

  const top = byAssignee[0];
  if (top.percentageOfActive < WORKLOAD_CONCENTRATION_THRESHOLDS.medium) return null;

  const severity = severityFromPercentage(top.percentageOfActive, WORKLOAD_CONCENTRATION_THRESHOLDS);
  const tasks = tasksByAssignee.get(top.userId) ?? [];

  return {
    id: `workload-concentration:${top.userId}`,
    type: "WORKLOAD_CONCENTRATION",
    severity,
    title: `Active workload is concentrated with ${top.name}`,
    description: `${top.name} is currently assigned the largest share of active work among all assignees.`,
    evidence: `${top.activeTaskCount} of ${activeTotal} active ${pluralTasks(
      top.activeTaskCount
    )} (${top.percentageOfActive}%) include ${top.name} as an assignee.`,
    affectedTaskCount: tasks.length,
    affectedTaskIds: tasks.map((t) => t.id),
    affectedTaskTitles: tasks.map((t) => t.title),
    recommendation: `Review whether active work assigned to ${top.name} needs to be redistributed.`,
  };
}

/* ============================================================
   SIGNAL SORTING (spec §22)
   ============================================================ */

const SEVERITY_ORDER: Record<CngIntelligenceSeverity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFORMATION: 4,
};

function sortSignals(signals: CngIntelligenceSignal[]): CngIntelligenceSignal[] {
  return [...signals].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.affectedTaskCount - a.affectedTaskCount;
  });
}

/* ============================================================
   MAIN ENTRY POINT
   ============================================================ */

/**
 * Builds the full CNG intelligence result from already-normalized
 * Planner task data. Deterministic given the same `tasks` and
 * `referenceDate` — no Date.now() calls anywhere in this module.
 *
 * COMPLETED-TASK EXCLUSION: every signal and every concentration table
 * here operates on ACTIVE tasks only (status !== "completed"), the
 * same definition of "active" used throughout lib/cng/calculations.ts.
 * A finished task cannot be overdue, cannot be a deadline risk, and
 * cannot contribute to current workload concentration — its data
 * still counts toward `summary.totalTasks` / `summary.completedTasks`,
 * but nothing else.
 */
export function buildCngIntelligence(
  tasks: CngTask[],
  referenceDate: Date = new Date()
): CngIntelligenceResult {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const activeTasks = tasks.filter((t) => t.status !== "completed");
  const activeTotal = activeTasks.length;

  // Date-based classification is delegated entirely to the existing
  // getDeadlineCategory rule (lib/cng/calculations.ts) so this engine
  // can never disagree with the Deadlines page about what "overdue"
  // or "due soon" means.
  const overdueTasks = activeTasks.filter(
    (t) => getDeadlineCategory(t, referenceDate) === "overdue"
  );
  const dueSoonTasks = activeTasks.filter((t) => {
    const category = getDeadlineCategory(t, referenceDate);
    return category === "due-today" || category === "due-soon";
  });
  const noDueDateTasks = activeTasks.filter(
    (t) => getDeadlineCategory(t, referenceDate) === "no-due-date"
  );

  const highPriorityTasks = activeTasks.filter(isHighPriorityTask);
  const unassignedTasks = activeTasks.filter((t) => t.assignees.length === 0);
  const notStartedTasks = activeTasks.filter((t) => t.status === "not-started");

  const { list: byBucket, tasksByBucket } = computeBucketConcentration(activeTasks);
  const { list: byAssignee, tasksByAssignee } = computeAssigneeConcentration(activeTasks);

  const signals: CngIntelligenceSignal[] = [];

  const overdueSignal = buildCountSignal({
    id: "overdue-work",
    type: "OVERDUE_WORK",
    activeTotal,
    thresholds: OVERDUE_THRESHOLDS,
    title:
      overdueTasks.length === 1
        ? "1 active task is overdue"
        : `${overdueTasks.length} active tasks are overdue`,
    description:
      "These active tasks have a due date earlier than the reference date and have not been marked complete.",
    evidence: `${overdueTasks.length} of ${activeTotal} active ${pluralTasks(
      overdueTasks.length
    )} (${safePercentage(overdueTasks.length, activeTotal)}%) are overdue.`,
    recommendation: "Review overdue tasks and confirm revised due dates or completion status.",
    tasks: overdueTasks,
  });
  if (overdueSignal) signals.push(overdueSignal);

  const deadlineExposureSignal = buildCountSignal({
    id: "deadline-exposure",
    type: "DEADLINE_EXPOSURE",
    activeTotal,
    thresholds: DEADLINE_EXPOSURE_THRESHOLDS,
    title:
      dueSoonTasks.length === 1
        ? "1 active task is due within the next 7 days"
        : `${dueSoonTasks.length} active tasks are due within the next 7 days`,
    description:
      "These active tasks are due today or within the next seven calendar days and are not yet overdue.",
    evidence: `${dueSoonTasks.length} of ${activeTotal} active ${pluralTasks(
      dueSoonTasks.length
    )} (${safePercentage(dueSoonTasks.length, activeTotal)}%) fall due within 7 days.`,
    recommendation: "Confirm these tasks are on schedule to avoid becoming overdue.",
    tasks: dueSoonTasks,
  });
  if (deadlineExposureSignal) signals.push(deadlineExposureSignal);

  const highPrioritySignal = buildCountSignal({
    id: "high-priority-exposure",
    type: "HIGH_PRIORITY_EXPOSURE",
    activeTotal,
    thresholds: HIGH_PRIORITY_THRESHOLDS,
    title:
      highPriorityTasks.length === 1
        ? "1 active task is marked high priority"
        : `${highPriorityTasks.length} active tasks are marked high priority`,
    description:
      "These active tasks carry Planner's urgent or important priority and have not been marked complete.",
    evidence: `${highPriorityTasks.length} of ${activeTotal} active ${pluralTasks(
      highPriorityTasks.length
    )} (${safePercentage(highPriorityTasks.length, activeTotal)}%) are high priority.`,
    recommendation: "Confirm resourcing is aligned to the volume of high-priority active work.",
    tasks: highPriorityTasks,
  });
  if (highPrioritySignal) signals.push(highPrioritySignal);

  const unassignedSignal = buildCountSignal({
    id: "unassigned-work",
    type: "UNASSIGNED_WORK",
    activeTotal,
    thresholds: UNASSIGNED_THRESHOLDS,
    title:
      unassignedTasks.length === 1
        ? "1 active task has no assignee"
        : `${unassignedTasks.length} active tasks have no assignee`,
    description: "These active tasks currently have zero assignees in Planner.",
    evidence: `${unassignedTasks.length} of ${activeTotal} active ${pluralTasks(
      unassignedTasks.length
    )} (${safePercentage(unassignedTasks.length, activeTotal)}%) are unassigned.`,
    recommendation: "Assign an owner to these tasks to establish accountability.",
    tasks: unassignedTasks,
  });
  if (unassignedSignal) signals.push(unassignedSignal);

  const missingDueDateSignal = buildCountSignal({
    id: "missing-due-dates",
    type: "MISSING_DUE_DATES",
    activeTotal,
    thresholds: MISSING_DUE_DATE_THRESHOLDS,
    title:
      noDueDateTasks.length === 1
        ? "1 active task has no due date set"
        : `${noDueDateTasks.length} active tasks have no due date set`,
    description: "Missing deadline coverage: these active tasks have no due date recorded in Planner.",
    evidence: `${noDueDateTasks.length} of ${activeTotal} active ${pluralTasks(
      noDueDateTasks.length
    )} (${safePercentage(noDueDateTasks.length, activeTotal)}%) have no due date.`,
    recommendation: "Add due dates to these tasks to enable deadline tracking.",
    tasks: noDueDateTasks,
  });
  if (missingDueDateSignal) signals.push(missingDueDateSignal);

  const executionBacklogSignal = buildCountSignal({
    id: "execution-backlog",
    type: "EXECUTION_BACKLOG",
    activeTotal,
    thresholds: EXECUTION_BACKLOG_THRESHOLDS,
    title:
      notStartedTasks.length === 1
        ? "1 active task has not yet started"
        : `${notStartedTasks.length} active tasks have not yet started`,
    description:
      "These active tasks are recorded in Planner at 0% progress. Not started is not the same as stalled — no judgment is made about why.",
    evidence: `${notStartedTasks.length} of ${activeTotal} active ${pluralTasks(
      notStartedTasks.length
    )} (${safePercentage(notStartedTasks.length, activeTotal)}%) have not been started.`,
    recommendation: "Review not-started active work to confirm it is appropriately scheduled and resourced.",
    tasks: notStartedTasks,
  });
  if (executionBacklogSignal) signals.push(executionBacklogSignal);

  const bucketConcentrationSignal = buildBucketConcentrationSignal(byBucket, tasksByBucket, activeTotal);
  if (bucketConcentrationSignal) signals.push(bucketConcentrationSignal);

  const workloadConcentrationSignal = buildWorkloadConcentrationSignal(
    byAssignee,
    tasksByAssignee,
    activeTotal
  );
  if (workloadConcentrationSignal) signals.push(workloadConcentrationSignal);

  const sortedSignals = sortSignals(signals);

  const summary: CngIntelligenceSummary = {
    totalTasks,
    activeTasks: activeTotal,
    completedTasks,
    overdueTasks: overdueTasks.length,
    dueSoonTasks: dueSoonTasks.length,
    highPriorityActiveTasks: highPriorityTasks.length,
    unassignedActiveTasks: unassignedTasks.length,
    activeTasksWithoutDueDate: noDueDateTasks.length,
    totalSignals: sortedSignals.length,
  };

  return {
    summary,
    signals: sortedSignals,
    concentration: { byBucket, byAssignee },
    referenceDate: referenceDate.toISOString(),
  };
}