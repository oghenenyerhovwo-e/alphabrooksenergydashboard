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