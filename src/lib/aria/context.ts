/**
 * ARIA — BUSINESS CONTEXT BUILDER (Stage C)
 *
 * Pure, deterministic transformation. No fetching, no AI calls, no
 * environment access. Consumes the outputs of the EXISTING calculation
 * and intelligence engines (lib/cng/calculations.ts, lib/cng/intelligence.ts)
 * and reshapes them into a single compact object for ARIA to reason over.
 *
 * This function invents no numbers of its own — every figure here comes
 * from a call into the existing trusted engines.
 */

import type { CngTask, CngBucket, CngUser, CngConnectionStatus } from "@/types/cng";
import {
  calculateCngOverview,
  calculateTeamPerformance,
  getDeadlineMetrics,
  calculateAttentionMetrics,
} from "@/lib/cng/calculations";
import { buildCngIntelligence } from "@/lib/cng/intelligence";
import type { OperationsTeamData, OperationsOverallSummary } from "@/types/operations";

/** Caps on list sizes sent to ARIA, so a large Planner plan can't blow up context size. */
const MAX_LISTED_TASKS = 15;
const MAX_LISTED_SIGNALS = 10;
const MAX_LISTED_TEAM_MEMBERS = 25;

export interface AriaTaskRef {
  title: string;
  bucket: string;
  assignees: string[];
  dueDate?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}

export interface AriaPhaseSummary {
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number | null;
}

export interface AriaTeamMemberSummary {
  name: string;
  role?: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number | null;
}

export interface AriaIntelligenceSignalSummary {
  severity: string;
  title: string;
  evidence: string;
  recommendation: string;
  affectedTaskCount: number;
}

export interface AriaBusinessContext {
  generatedAt: string;
  connectionStatus: CngConnectionStatus;
  lastUpdated: string | null;

  /** True only when Graph is connected AND at least one task exists. */
  hasUsableData: boolean;

  overview: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    notStartedTasks: number;
    overdueCount: number;
    upcomingCount: number;
    overallProgressPercentage: number | null;
    projectStatus: string;
    completedPhaseCount: number;
    totalPhaseCount: number;
  };

  phases: AriaPhaseSummary[];

  team: {
    totalTasks: number;
    completedTasks: number;
    unassignedTasks: number;
    teamCompletionRate: number | null;
    members: AriaTeamMemberSummary[];
  };

  deadlines: {
    overdueCount: number;
    dueTodayCount: number;
    dueSoonCount: number;
    upcomingCount: number;
    noDueDateCount: number;
    /** Most urgent active tasks with a due date, most overdue/soonest first. Capped. */
    mostUrgent: AriaTaskRef[];
  };

  attention: {
    totalAttentionTasks: number;
    criticalCount: number;
    highCount: number;
    /** Highest-priority attention tasks, capped. */
    topTasks: AriaTaskRef[];
  };

  intelligence: {
    totalSignals: number;
    /** Sorted CRITICAL -> INFORMATION already, per intelligence.ts. Capped. */
    signals: AriaIntelligenceSignalSummary[];
  };

  dataIntegrity: {
    hasTasks: boolean;
    unknownBucketTaskCount: number;
    unmappedUserCount: number;
  };
}

function toTaskRef(task: {
  title: string;
  bucket: { name: string };
  assignees: { name: string }[];
  dueDate?: string;
  daysOverdue?: number;
  daysUntilDue?: number;
}): AriaTaskRef {
  return {
    title: task.title,
    bucket: task.bucket.name,
    assignees: task.assignees.map((a) => a.name),
    dueDate: task.dueDate,
    daysOverdue: task.daysOverdue,
    daysUntilDue: task.daysUntilDue,
  };
}

export function buildAriaContext(
  tasks: CngTask[],
  buckets: CngBucket[],
  users: CngUser[],
  status: CngConnectionStatus,
  lastUpdated: string | null
): AriaBusinessContext {
  const overview = calculateCngOverview(tasks, buckets, users, status);
  const team = calculateTeamPerformance(tasks, users);
  const deadlineMetrics = getDeadlineMetrics(tasks);
  const attentionMetrics = calculateAttentionMetrics(tasks);
  const intelligence = buildCngIntelligence(tasks);

  const hasUsableData = status === "connected" && tasks.length > 0;

  const urgentDeadlineTasks = deadlineMetrics.tasks
    .filter((t) => t.deadlineCategory === "overdue" || t.deadlineCategory === "due-today" || t.deadlineCategory === "due-soon")
    .slice(0, MAX_LISTED_TASKS)
    .map(toTaskRef);

  const topAttentionTasks = attentionMetrics.tasks
    .slice(0, MAX_LISTED_TASKS)
    .map((t) => toTaskRef({ ...t, daysOverdue: t.daysOverdue }));

  return {
    generatedAt: new Date().toISOString(),
    connectionStatus: status,
    lastUpdated,
    hasUsableData,

    overview: {
      totalTasks: overview.taskMetrics.totalTasks,
      completedTasks: overview.taskMetrics.completedTasks,
      inProgressTasks: overview.taskMetrics.inProgressTasks,
      notStartedTasks: overview.taskMetrics.notStartedTasks,
      overdueCount: overview.taskMetrics.overdueTasks.length,
      upcomingCount: overview.taskMetrics.upcomingTasks.length,
      overallProgressPercentage: overview.readiness.percentage,
      projectStatus: overview.readiness.status,
      completedPhaseCount: overview.readiness.completedPhaseCount,
      totalPhaseCount: overview.readiness.totalPhaseCount,
    },

    phases: overview.phaseMetrics.map((p) => ({
      name: p.name,
      status: p.status,
      totalTasks: p.totalTasks,
      completedTasks: p.completedTasks,
      completionPercentage: p.completionPercentage,
    })),

    team: {
      totalTasks: team.summary.totalTasks,
      completedTasks: team.summary.completedTasks,
      unassignedTasks: team.summary.unassignedTasks,
      teamCompletionRate: team.summary.completionRate,
      members: team.members.slice(0, MAX_LISTED_TEAM_MEMBERS).map((m) => ({
        name: m.name,
        role: m.role,
        totalTasks: m.totalTasks,
        completedTasks: m.completedTasks,
        overdueTasks: m.overdueTasks,
        completionRate: m.completionRate,
      })),
    },

    deadlines: {
      overdueCount: deadlineMetrics.summary.overdue,
      dueTodayCount: deadlineMetrics.summary.dueToday,
      dueSoonCount: deadlineMetrics.summary.dueSoon,
      upcomingCount: deadlineMetrics.summary.upcoming,
      noDueDateCount: deadlineMetrics.summary.noDueDate,
      mostUrgent: urgentDeadlineTasks,
    },

    attention: {
      totalAttentionTasks: attentionMetrics.summary.totalAttentionTasks,
      criticalCount: attentionMetrics.summary.critical,
      highCount: attentionMetrics.summary.high,
      topTasks: topAttentionTasks,
    },

    intelligence: {
      totalSignals: intelligence.summary.totalSignals,
      signals: intelligence.signals.slice(0, MAX_LISTED_SIGNALS).map((s) => ({
        severity: s.severity,
        title: s.title,
        evidence: s.evidence,
        recommendation: s.recommendation,
        affectedTaskCount: s.affectedTaskCount,
      })),
    },

    dataIntegrity: {
      hasTasks: overview.dataIntegrity.hasTasks,
      unknownBucketTaskCount: overview.dataIntegrity.unknownBucketTaskCount,
      unmappedUserCount: overview.dataIntegrity.unmappedUserCount,
    },
  };
}

/* ============================================================
   MAIN OPERATIONS — ARIA CONTEXT BUILDER (Phase 5)

   Independent of everything above: no shared state, no shared prompt
   shape, no CNG imports. Consumes the existing Phase 2 data layer
   (OperationsTeamData from lib/operations/team-data.ts) and reshapes it
   into a compact, capped object for ARIA chat. Every figure here is
   already computed by team-data.ts — this function only selects,
   caps, and relabels; it never recalculates a percentage or status.
   ============================================================ */

/** Caps so a large Planner plan can't blow up the ARIA chat prompt. */
const MAX_OPERATIONS_EMPLOYEES = 30;
const MAX_OPERATIONS_TASK_TITLES = 10;

export interface AriaOperationsEmployeeContext {
  name: string;
  /** False only if this employee somehow has zero assigned tasks — see note below. */
  hasTasks: boolean;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueCount: number;
  /** null only when hasTasks is false — render as "No tasks assigned yet.", never 0%. */
  completionPercentage: number | null;
  completedTaskTitles: string[];
  inProgressTaskTitles: string[];
  pendingTaskTitles: string[];
  overdueTaskTitles: string[];
  /** "<blocker text> (task: <task title>)", capped. Empty = no blocker for this person. */
  blockers: string[];
}

export interface AriaOperationsContext {
  generatedAt: string;
  connectionStatus: OperationsTeamData["status"];
  lastUpdated: string | null;
  /** True only when Graph is connected AND there is at least one task (assigned or unassigned). */
  hasUsableData: boolean;
  employees: AriaOperationsEmployeeContext[];
  unassignedTaskCount: number;
  unassignedTaskTitles: string[];
  overall: OperationsOverallSummary;
}

/**
 * Reshapes the Phase 2 Main Operations data layer for ARIA chat.
 *
 * NOTE ON "employees with no tasks": today's roster (team-data.ts) is
 * built only from Planner task assignees, so every entry in
 * data.employees necessarily has totalTasks >= 1. The hasTasks /
 * completionPercentage-null path below is kept so this stays correct
 * if the roster is ever sourced independently of Planner tasks in the
 * future — it is not reachable with the current data layer.
 */
export function buildOperationsAriaContext(data: OperationsTeamData): AriaOperationsContext {
  const hasUsableData =
    data.status === "connected" && (data.employees.length > 0 || data.unassignedTasks.length > 0);

  const employees: AriaOperationsEmployeeContext[] = data.employees
    .slice(0, MAX_OPERATIONS_EMPLOYEES)
    .map((e) => ({
      name: e.name,
      hasTasks: e.totalTasks > 0,
      totalTasks: e.totalTasks,
      completedTasks: e.completedTasks,
      inProgressTasks: e.inProgressTasks,
      pendingTasks: e.pendingTasks,
      overdueCount: e.overdueTasks.length,
      completionPercentage: e.completionPercentage,
      completedTaskTitles: e.tasks
        .filter((t) => t.status === "completed")
        .slice(0, MAX_OPERATIONS_TASK_TITLES)
        .map((t) => t.title),
      inProgressTaskTitles: e.tasks
        .filter((t) => t.status === "in-progress")
        .slice(0, MAX_OPERATIONS_TASK_TITLES)
        .map((t) => t.title),
      pendingTaskTitles: e.tasks
        .filter((t) => t.status === "not-started")
        .slice(0, MAX_OPERATIONS_TASK_TITLES)
        .map((t) => t.title),
      overdueTaskTitles: e.overdueTasks.slice(0, MAX_OPERATIONS_TASK_TITLES).map((t) => t.title),
      blockers: e.blockers
        .slice(0, MAX_OPERATIONS_TASK_TITLES)
        .map((b) => `${b.text} (task: ${b.taskTitle})`),
    }));

  return {
    generatedAt: new Date().toISOString(),
    connectionStatus: data.status,
    lastUpdated: data.lastUpdated,
    hasUsableData,
    employees,
    unassignedTaskCount: data.unassignedTasks.length,
    unassignedTaskTitles: data.unassignedTasks.slice(0, MAX_OPERATIONS_TASK_TITLES).map((t) => t.title),
    overall: data.overall,
  };
}