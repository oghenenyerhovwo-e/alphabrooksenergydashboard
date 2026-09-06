import { USER_MAP } from "@/config/users";
import type {
  CngTask,
  CngBucket,
  CngUser,
  CngConnectionStatus,
  CngPhaseMetrics,
  CngPhaseStatus,
  CngTaskMetrics,
  CngProjectReadiness,
  CngProjectStatus,
  CngDataIntegrity,
  TeamMemberPerformance,
  TeamPerformanceSummary,
  CngTeamPerformance,
} from "@/types/cng";

const UNKNOWN_BUCKET_NAME = "Unknown Bucket";

/** Tasks flagged "important" = Planner's own urgent/important priority bands, still incomplete. */
const IMPORTANT_PRIORITIES = new Set(["urgent", "important"]);

/* ============================================================
   TASK METRICS
   ============================================================ */

export function calculateStatusCounts(tasks: CngTask[]): {
  completed: number;
  inProgress: number;
  notStarted: number;
} {
  return {
    completed: tasks.filter((t) => t.status === "completed").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    notStarted: tasks.filter((t) => t.status === "not-started").length,
  };
}

export function calculateOverdueTasks(tasks: CngTask[]): CngTask[] {
  return tasks.filter((t) => t.isOverdue);
}

export function calculateUpcomingTasks(tasks: CngTask[]): CngTask[] {
  return tasks.filter((t) => t.isUpcoming);
}

export function calculateImportantTasks(tasks: CngTask[]): CngTask[] {
  return tasks.filter(
    (t) => t.priority !== undefined && IMPORTANT_PRIORITIES.has(t.priority) && t.status !== "completed"
  );
}

export function calculateTaskMetrics(tasks: CngTask[]): CngTaskMetrics {
  const counts = calculateStatusCounts(tasks);
  return {
    totalTasks: tasks.length,
    completedTasks: counts.completed,
    inProgressTasks: counts.inProgress,
    notStartedTasks: counts.notStarted,
    overdueTasks: calculateOverdueTasks(tasks),
    upcomingTasks: calculateUpcomingTasks(tasks),
    importantTasks: calculateImportantTasks(tasks),
  };
}

/* ============================================================
   PHASE METRICS
   A "phase" is now exactly one live Planner bucket — built straight
   from whatever `buckets` the API returned this call. No fixed count,
   no hardcoded bucket IDs. Add/remove/rename a bucket in Planner and
   this list changes on the next fetch, with zero code changes.
   ============================================================ */

export function calculateCompletionPercentage(completed: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((completed / total) * 100);
}

/**
 * PHASE COMPLETION RULE
 * - NOT_YET_POPULATED: the bucket has zero tasks. Never treated as 0%.
 * - NOT_STARTED: has tasks, but zero are completed.
 * - IN_PROGRESS: has tasks, some (not all) are completed.
 * - COMPLETE: has at least one task AND every task is completed.
 */
function derivePhaseStatus(totalTasks: number, completedTasks: number): CngPhaseStatus {
  if (totalTasks === 0) return "NOT_YET_POPULATED";
  if (completedTasks === totalTasks) return "COMPLETE";
  if (completedTasks === 0) return "NOT_STARTED";
  return "IN_PROGRESS";
}

export function calculatePhaseMetrics(
  tasks: CngTask[],
  buckets: CngBucket[]
): CngPhaseMetrics[] {
  const totalBuckets = buckets.length;
  const weight = totalBuckets > 0 ? 1 / totalBuckets : 0;

  return buckets.map((bucket, index) => {
    const bucketTasks = tasks.filter((t) => t.bucket.id === bucket.id);
    const totalTasks = bucketTasks.length;
    const completedTasks = bucketTasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = bucketTasks.filter((t) => t.status === "in-progress").length;
    const notStartedTasks = bucketTasks.filter((t) => t.status === "not-started").length;
    const overdueTasks = bucketTasks.filter((t) => t.isOverdue).length;

    return {
      id: bucket.id,
      name: bucket.name,
      order: index,
      totalTasks,
      completedTasks,
      incompleteTasks: totalTasks - completedTasks,
      inProgressTasks,
      notStartedTasks,
      overdueTasks,
      completionPercentage: calculateCompletionPercentage(completedTasks, totalTasks),
      status: derivePhaseStatus(totalTasks, completedTasks),
      weight,
      shortName: bucket.shortName,
      group: bucket.group,
    };
  });
}

/* ============================================================
   BUCKET / PHASE OVERVIEW SUMMARY (Phase 5)
   ============================================================ */

export interface CngBucketOverviewSummary {
  totalTasks: number;
  populatedBucketCount: number;
  emptyBucketCount: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export function calculateBucketOverviewSummary(
  taskMetrics: CngTaskMetrics,
  phaseMetrics: CngPhaseMetrics[]
): CngBucketOverviewSummary {
  return {
    totalTasks: taskMetrics.totalTasks,
    populatedBucketCount: phaseMetrics.filter((p) => p.status !== "NOT_YET_POPULATED").length,
    emptyBucketCount: phaseMetrics.filter((p) => p.status === "NOT_YET_POPULATED").length,
    activeTasks: taskMetrics.totalTasks - taskMetrics.completedTasks,
    completedTasks: taskMetrics.completedTasks,
    overdueTasks: taskMetrics.overdueTasks.length,
  };
}

/* ============================================================
   PROJECT READINESS
   ============================================================ */

export function calculateProjectReadiness(
  phaseMetrics: CngPhaseMetrics[],
  connectionStatus: CngConnectionStatus,
  taskMetrics: CngTaskMetrics
): CngProjectReadiness {
  const totalPhaseCount = phaseMetrics.length;
  const completedPhaseCount = phaseMetrics.filter((p) => p.status === "COMPLETE").length;

  if (connectionStatus !== "connected" || totalPhaseCount === 0 || taskMetrics.totalTasks === 0) {
    return {
      completedPhaseCount,
      totalPhaseCount,
      percentage: null,
      status: "DATA_INSUFFICIENT",
    };
  }

  const weightedSum = phaseMetrics.reduce(
    (sum, p) => sum + (p.completionPercentage ?? 0) * p.weight,
    0
  );
  const percentage = Math.round(weightedSum);

  return {
    completedPhaseCount,
    totalPhaseCount,
    percentage,
    status: deriveProjectStatus(percentage, taskMetrics),
  };
}

const CRITICAL_OVERDUE_RATIO = 0.25;

function deriveProjectStatus(percentage: number, taskMetrics: CngTaskMetrics): CngProjectStatus {
  if (percentage >= 100) return "COMPLETE";

  const overdueCount = taskMetrics.overdueTasks.length;
  if (overdueCount === 0) return "ON_TRACK";

  const incompleteCount = taskMetrics.totalTasks - taskMetrics.completedTasks;
  const overdueRatio = incompleteCount > 0 ? overdueCount / incompleteCount : 0;

  return overdueRatio >= CRITICAL_OVERDUE_RATIO ? "CRITICAL" : "NEEDS_ATTENTION";
}

/* ============================================================
   DATA INTEGRITY
   ============================================================ */

export function calculateDataIntegrity(
  tasks: CngTask[],
  buckets: CngBucket[],
  users: CngUser[],
  connectionStatus: CngConnectionStatus
): CngDataIntegrity {
  return {
    connectionStatus,
    hasTasks: tasks.length > 0,
    unknownBucketTaskCount: tasks.filter((t) => t.bucket.name === UNKNOWN_BUCKET_NAME).length,
    unmappedUserCount: users.filter((u) => u.isUnmapped).length,
  };
}

/* ============================================================
   ATTENTION SIGNAL (overview card, Phase 1-5)
   ============================================================ */

export interface CngAttentionSignal {
  tone: "critical" | "warning" | "info" | "positive";
  title: string;
  detail: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function earliestByDueDate(tasks: CngTask[]): CngTask {
  return [...tasks].sort((a, b) => {
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
    return aDue - bDue;
  })[0];
}

export function calculateAttentionSignal(
  connectionStatus: CngConnectionStatus,
  taskMetrics: CngTaskMetrics,
  dataIntegrity: CngDataIntegrity,
  readiness: CngProjectReadiness
): CngAttentionSignal {
  if (connectionStatus !== "connected") {
    return {
      tone: "warning",
      title: "Not connected",
      detail: "Connect Microsoft Graph in Settings to see live Planner signals.",
    };
  }

  if (!dataIntegrity.hasTasks) {
    return {
      tone: "info",
      title: "No tasks yet",
      detail: "The CNG Planner is connected but no tasks are available yet.",
    };
  }

  if (taskMetrics.overdueTasks.length > 0) {
    const mostUrgent = earliestByDueDate(taskMetrics.overdueTasks);
    const count = taskMetrics.overdueTasks.length;
    return {
      tone: "critical",
      title: count === 1 ? "1 task is overdue" : `${count} tasks are overdue`,
      detail: `Most urgent: "${mostUrgent.title}"${
        mostUrgent.dueDate ? ` — was due ${formatDate(mostUrgent.dueDate)}` : ""
      }.`,
    };
  }

  if (dataIntegrity.unknownBucketTaskCount > 0) {
    return {
      tone: "warning",
      title: "Some data needs mapping",
      detail: `${dataIntegrity.unknownBucketTaskCount} task(s) are in a bucket that no longer matches a live Planner bucket.`,
    };
  }

  if (taskMetrics.upcomingTasks.length > 0) {
    const next = earliestByDueDate(taskMetrics.upcomingTasks);
    return {
      tone: "info",
      title: "Nothing overdue",
      detail: `Next deadline: "${next.title}"${next.dueDate ? ` on ${formatDate(next.dueDate)}` : ""}.`,
    };
  }

  if (readiness.status === "COMPLETE") {
    return {
      tone: "positive",
      title: "All buckets complete",
      detail: "Every bucket in the CNG Planner plan is fully completed.",
    };
  }

  return {
    tone: "positive",
    title: "No urgent items",
    detail: "Nothing overdue and no upcoming deadlines in the next 7 days.",
  };
}

/* ============================================================
   COMBINED OVERVIEW
   ============================================================ */

export interface CngOverview {
  taskMetrics: CngTaskMetrics;
  phaseMetrics: CngPhaseMetrics[];
  readiness: CngProjectReadiness;
  dataIntegrity: CngDataIntegrity;
  attentionSignal: CngAttentionSignal;
}

export function calculateCngOverview(
  tasks: CngTask[],
  buckets: CngBucket[],
  users: CngUser[],
  connectionStatus: CngConnectionStatus
): CngOverview {
  const taskMetrics = calculateTaskMetrics(tasks);
  const phaseMetrics = calculatePhaseMetrics(tasks, buckets);
  const readiness = calculateProjectReadiness(phaseMetrics, connectionStatus, taskMetrics);
  const dataIntegrity = calculateDataIntegrity(tasks, buckets, users, connectionStatus);
  const attentionSignal = calculateAttentionSignal(
    connectionStatus,
    taskMetrics,
    dataIntegrity,
    readiness
  );

  return { taskMetrics, phaseMetrics, readiness, dataIntegrity, attentionSignal };
}

/* ============================================================
   TEAM PERFORMANCE (Phase 4)
   ============================================================ */

function buildPerformanceRecord(
  userId: string,
  name: string,
  role: string | undefined,
  taskList: CngTask[]
): TeamMemberPerformance {
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter((t) => t.status === "completed").length;
  const inProgressTasks = taskList.filter((t) => t.status === "in-progress").length;
  const notStartedTasks = taskList.filter((t) => t.status === "not-started").length;
  const overdueTasks = taskList.filter((t) => t.isOverdue).length;
  const activeTasks = totalTasks - completedTasks;

  return {
    userId,
    name,
    role,
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks,
    overdueTasks,
    activeTasks,
    completionRate: calculateCompletionPercentage(completedTasks, totalTasks),
  };
}

export function calculateTeamMemberPerformance(tasks: CngTask[], user: CngUser): TeamMemberPerformance {
  const userTasks = tasks.filter((t) => t.assignees.some((a) => a.id === user.id));
  return buildPerformanceRecord(user.id, user.name, user.role, userTasks);
}

export function calculateUnassignedPerformance(tasks: CngTask[]): TeamMemberPerformance {
  const unassignedTasks = tasks.filter((t) => t.assignees.length === 0);
  return buildPerformanceRecord("unassigned", "Unassigned", undefined, unassignedTasks);
}

export function calculateTeamPerformanceSummary(tasks: CngTask[]): TeamPerformanceSummary {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const inProgressTasks = tasks.filter((t) => t.status === "in-progress").length;
  const notStartedTasks = tasks.filter((t) => t.status === "not-started").length;
  const overdueTasks = tasks.filter((t) => t.isOverdue).length;
  const activeTasks = totalTasks - completedTasks;
  const unassignedTasks = tasks.filter((t) => t.assignees.length === 0).length;

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    notStartedTasks,
    overdueTasks,
    activeTasks,
    unassignedTasks,
    completionRate: calculateCompletionPercentage(completedTasks, totalTasks),
  };
}

function buildTeamRoster(contextUsers: CngUser[]): CngUser[] {
  const byId = new Map<string, CngUser>();

  for (const [id, info] of Object.entries(USER_MAP)) {
    byId.set(id, { id, name: info.name, role: info.role });
  }
  for (const user of contextUsers) {
    if (!byId.has(user.id)) {
      byId.set(user.id, user);
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function calculateTeamPerformance(tasks: CngTask[], users: CngUser[]): CngTeamPerformance {
  const roster = buildTeamRoster(users);
  const members = roster.map((user) => calculateTeamMemberPerformance(tasks, user));
  const unassigned = calculateUnassignedPerformance(tasks);
  const summary = calculateTeamPerformanceSummary(tasks);

  return { summary, members, unassigned };
}

/* ============================================================
   DEADLINES (Phase 6)
   ============================================================ */

export type CngDeadlineCategory =
  | "overdue"
  | "due-today"
  | "due-soon"
  | "upcoming"
  | "no-due-date";

export interface CngDeadlineTask extends CngTask {
  deadlineCategory: CngDeadlineCategory;
  /** Only set when deadlineCategory === "overdue". */
  daysOverdue?: number;
  /** Only set when the task has a due date and is not overdue. */
  daysUntilDue?: number;
}

export interface CngDeadlineSummary {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  upcoming: number;
  noDueDate: number;
}

export interface CngDeadlineMetrics {
  summary: CngDeadlineSummary;
  /** Active (incomplete) tasks only, pre-sorted by urgency. */
  tasks: CngDeadlineTask[];
}

const DUE_SOON_WINDOW_DAYS = 7;

/**
 * Extracts the calendar date (Y-M-D) portion of an ISO string and
 * builds a LOCAL midnight Date from those components directly — never
 * via `new Date(isoString)` on a date-only value, which JS parses as
 * UTC and can silently shift the day depending on the browser's/
 * server's timezone. This is the one place deadline dates are parsed;
 * every calculation below goes through it.
 */
function toCalendarDate(iso: string): Date {
  const datePart = iso.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 86400000;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Human-readable calendar date, matching the app's existing "en-GB"
 * short-date convention (e.g. "12 Sep 2026"), with Today/Tomorrow/
 * Yesterday overrides for at-a-glance scanning. Never shows a raw ISO
 * timestamp.
 */
export function formatCalendarDate(dueDate: string, today: Date = startOfToday()): string {
  const due = toCalendarDate(dueDate);
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return due.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatOverdueLabel(daysOverdue: number): string {
  return daysOverdue === 1 ? "Overdue by 1 day" : `Overdue by ${daysOverdue} days`;
}

/**
 * DEADLINE CATEGORY RULE (deterministic, calendar-date based).
 * Callers must only pass incomplete tasks — category is meaningless
 * for a completed task and this function does not check status.
 * - no-due-date: task has no dueDate.
 * - overdue: dueDate is strictly before today.
 * - due-today: dueDate is today.
 * - due-soon: dueDate is within the next 7 calendar days (inclusive).
 * - upcoming: dueDate is beyond that 7-day window.
 */
export function getDeadlineCategory(task: CngTask, today: Date = startOfToday()): CngDeadlineCategory {
  if (!task.dueDate) return "no-due-date";
  const diff = daysBetween(today, toCalendarDate(task.dueDate));
  if (diff < 0) return "overdue";
  if (diff === 0) return "due-today";
  if (diff <= DUE_SOON_WINDOW_DAYS) return "due-soon";
  return "upcoming";
}

const DEADLINE_CATEGORY_ORDER: Record<CngDeadlineCategory, number> = {
  overdue: 0,
  "due-today": 1,
  "due-soon": 2,
  upcoming: 3,
  "no-due-date": 4,
};

/**
 * Single entry point the Deadlines page calls. Operates purely on the
 * already-loaded task list from CngDataContext — no fetching.
 * Completed tasks are excluded entirely (spec §9): a finished task's
 * deadline is no longer an active management concern.
 */
export function getDeadlineMetrics(tasks: CngTask[], today: Date = startOfToday()): CngDeadlineMetrics {
  const activeTasks = tasks.filter((t) => t.status !== "completed");

  const enriched: CngDeadlineTask[] = activeTasks.map((task) => {
    const deadlineCategory = getDeadlineCategory(task, today);
    let daysOverdue: number | undefined;
    let daysUntilDue: number | undefined;

    if (task.dueDate) {
      const diff = daysBetween(today, toCalendarDate(task.dueDate));
      if (diff < 0) daysOverdue = -diff;
      else daysUntilDue = diff;
    }

    return { ...task, deadlineCategory, daysOverdue, daysUntilDue };
  });

  enriched.sort((a, b) => {
    const orderDiff = DEADLINE_CATEGORY_ORDER[a.deadlineCategory] - DEADLINE_CATEGORY_ORDER[b.deadlineCategory];
    if (orderDiff !== 0) return orderDiff;
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });

  const summary: CngDeadlineSummary = {
    overdue: enriched.filter((t) => t.deadlineCategory === "overdue").length,
    dueToday: enriched.filter((t) => t.deadlineCategory === "due-today").length,
    dueSoon: enriched.filter((t) => t.deadlineCategory === "due-soon").length,
    upcoming: enriched.filter((t) => t.deadlineCategory === "upcoming").length,
    noDueDate: enriched.filter((t) => t.deadlineCategory === "no-due-date").length,
  };

  return { summary, tasks: enriched };
}

/* ============================================================
   NEEDS ATTENTION (Phase 6)
   ============================================================ */

export type CngAttentionSignalType =
  | "overdue"
  | "due-today"
  | "high-priority"
  | "unassigned"
  | "no-due-date";

export type CngAttentionPriorityLevel = "critical" | "high" | "medium" | "low";

export interface CngAttentionTask extends CngTask {
  signals: CngAttentionSignalType[];
  priorityLevel: CngAttentionPriorityLevel;
  daysOverdue?: number;
}

export interface CngAttentionSummary {
  totalAttentionTasks: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
  unassigned: number;
  noDueDate: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface CngAttentionMetrics {
  summary: CngAttentionSummary;
  tasks: CngAttentionTask[];
}

/**
 * ATTENTION SIGNAL RULE — objective, evaluated per active (incomplete)
 * task only. A task can carry any combination of these at once:
 * - overdue: dueDate is strictly before today.
 * - due-today: dueDate is today.
 * - high-priority: task.priority is in the app's existing "important"
 *   band (the same IMPORTANT_PRIORITIES set used by calculateImportantTasks
 *   above) — no new priority concept is invented.
 * - unassigned: task.assignees is empty.
 * - no-due-date: task has no dueDate at all (mutually exclusive with
 *   overdue/due-today, since those both require a dueDate).
 */
export function getAttentionSignals(task: CngTask, today: Date = startOfToday()): CngAttentionSignalType[] {
  const signals: CngAttentionSignalType[] = [];

  if (task.dueDate) {
    const diff = daysBetween(today, toCalendarDate(task.dueDate));
    if (diff < 0) signals.push("overdue");
    else if (diff === 0) signals.push("due-today");
  } else {
    signals.push("no-due-date");
  }

  if (task.priority !== undefined && IMPORTANT_PRIORITIES.has(task.priority)) {
    signals.push("high-priority");
  }

  if (task.assignees.length === 0) {
    signals.push("unassigned");
  }

  return signals;
}

/**
 * ATTENTION PRIORITY RULE — deterministic, checked in this order:
 * 1. CRITICAL — overdue AND high-priority.
 * 2. HIGH — overdue (any priority), or due today.
 * 3. MEDIUM — high-priority (and neither overdue nor due-today), or unassigned.
 * 4. LOW — anything else that still has at least one signal
 *    (e.g. an active task whose only signal is no-due-date).
 * This mirrors the ranking suggested in the spec (§18) collapsed into
 * four explicit, reproducible tiers.
 */
export function getAttentionPriority(signals: CngAttentionSignalType[]): CngAttentionPriorityLevel {
  const has = (s: CngAttentionSignalType) => signals.includes(s);
  if (has("overdue") && has("high-priority")) return "critical";
  if (has("overdue") || has("due-today")) return "high";
  if (has("high-priority") || has("unassigned")) return "medium";
  return "low";
}

const ATTENTION_PRIORITY_ORDER: Record<CngAttentionPriorityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Single entry point the Needs Attention page calls. Runs once over the
 * raw `tasks` array from CngDataContext, so:
 * - a task with multiple signals is represented ONCE, carrying every
 *   signal it triggered (spec §20/§21) — never duplicated per signal.
 * - a task with multiple assignees is still one row, because uniqueness
 *   here is driven by task identity (task.id via the source array),
 *   not by assignee.
 * Only active (incomplete) tasks that trigger at least one signal are
 * included.
 */
export function getAttentionTasks(tasks: CngTask[], today: Date = startOfToday()): CngAttentionTask[] {
  const activeTasks = tasks.filter((t) => t.status !== "completed");

  const withSignals = activeTasks
    .map((task) => {
      const signals = getAttentionSignals(task, today);
      if (signals.length === 0) return null;

      let daysOverdue: number | undefined;
      if (task.dueDate) {
        const diff = daysBetween(today, toCalendarDate(task.dueDate));
        if (diff < 0) daysOverdue = -diff;
      }

      const priorityLevel = getAttentionPriority(signals);
      return { ...task, signals, priorityLevel, daysOverdue } as CngAttentionTask;
    })
    .filter((t): t is CngAttentionTask => t !== null);

  withSignals.sort((a, b) => {
    const orderDiff = ATTENTION_PRIORITY_ORDER[a.priorityLevel] - ATTENTION_PRIORITY_ORDER[b.priorityLevel];
    if (orderDiff !== 0) return orderDiff;
    const aDue = a.dueDate ? Date.parse(a.dueDate) : Infinity;
    const bDue = b.dueDate ? Date.parse(b.dueDate) : Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return a.title.localeCompare(b.title);
  });

  return withSignals;
}

/**
 * Summary counts for the top of the Needs Attention page.
 * `totalAttentionTasks` counts each qualifying task exactly once.
 * Per-signal and per-priority counts overlap by design (one task can
 * contribute to several) and are not expected to sum to the total
 * (spec §27).
 */
export function getAttentionSummary(attentionTasks: CngAttentionTask[]): CngAttentionSummary {
  return {
    totalAttentionTasks: attentionTasks.length,
    overdue: attentionTasks.filter((t) => t.signals.includes("overdue")).length,
    dueToday: attentionTasks.filter((t) => t.signals.includes("due-today")).length,
    highPriority: attentionTasks.filter((t) => t.signals.includes("high-priority")).length,
    unassigned: attentionTasks.filter((t) => t.signals.includes("unassigned")).length,
    noDueDate: attentionTasks.filter((t) => t.signals.includes("no-due-date")).length,
    critical: attentionTasks.filter((t) => t.priorityLevel === "critical").length,
    high: attentionTasks.filter((t) => t.priorityLevel === "high").length,
    medium: attentionTasks.filter((t) => t.priorityLevel === "medium").length,
    low: attentionTasks.filter((t) => t.priorityLevel === "low").length,
  };
}

/** Single entry point the Attention page calls — keeps calc logic out of the UI. */
export function calculateAttentionMetrics(tasks: CngTask[], today: Date = startOfToday()): CngAttentionMetrics {
  const attentionTasks = getAttentionTasks(tasks, today);
  const summary = getAttentionSummary(attentionTasks);
  return { summary, tasks: attentionTasks };
}