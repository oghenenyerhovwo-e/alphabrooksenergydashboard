export interface CngUser {
  id: string;
  name: string;
  role?: string;
  isUnmapped?: boolean;
}

export interface CngBucket {
  id: string;
  name: string;
  /** Planner's own sort key — live from Graph, decides display order. */
  orderHint: string;
  /** Optional cosmetic label from config/buckets.ts. Never required. */
  shortName?: string;
  group?: string;
}

export interface CngTask {
  id: string;
  title: string;

  bucket: {
    id: string;
    name: string;
  };

  assignees: {
    id: string;
    name: string;
    role?: string;
  }[];

  progress: number;
  status: "not-started" | "in-progress" | "completed";
  priority?: string;

  startDate?: string;
  dueDate?: string;
  completedDate?: string;

  isOverdue: boolean;
  isUpcoming: boolean;
}

export type CngConnectionStatus = "connected" | "not_connected" | "error";

export interface CngData {
  tasks: CngTask[];
  buckets: CngBucket[];
  users: CngUser[];
  lastUpdated: string | null;
  status: CngConnectionStatus;
  message?: string;
}

/** Raw shapes as they would arrive from Microsoft Graph (Planner). */
export interface RawPlannerTask {
  id: string;
  title: string;
  bucketId: string;
  percentComplete: number;
  priority?: number;
  startDateTime?: string;
  dueDateTime?: string;
  completedDateTime?: string;
  assignments?: Record<string, unknown>;
}

export interface RawPlannerBucket {
  id: string;
  name: string;
  /** Planner's sort key string, e.g. "8585269805293081119". Always present on the live resource. */
  orderHint: string;
}

export interface RawGraphUser {
  id: string;
  displayName: string;
}

/* ============================================================
   CALCULATION ENGINE TYPES
   ============================================================ */

/**
 * A phase is NOT_YET_POPULATED when it has zero tasks — this is never
 * treated as 0% progress. NOT_STARTED means it has tasks but none are
 * complete. COMPLETE requires at least one task AND every task complete.
 */
export type CngPhaseStatus =
  | "NOT_YET_POPULATED"
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETE";

/**
 * A "phase" is now just one live Planner bucket — there is no separate
 * official-phase config layer anymore. Whatever buckets Graph returns
 * become phases, 1:1, with no fixed count.
 */
export interface CngPhaseMetrics {
  id: string;   // = bucket id
  name: string; // = live bucket name from Graph
  /** Display position after sorting by live orderHint. Not a fixed config value. */
  order: number;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  /** Phase 5 addition: status breakdown, sourced the same way as completedTasks. */
  inProgressTasks: number;
  notStartedTasks: number;
  /** Phase 5 addition: count of tasks in this bucket where isOverdue === true. */
  overdueTasks: number;
  /** null only when status is NOT_YET_POPULATED — never a fake percentage. */
  completionPercentage: number | null;
  status: CngPhaseStatus;
  /** This bucket's share of overall readiness, 0–1. Equal split today (1 / bucket count). */
  weight: number;
  /** Phase 5 addition: cosmetic metadata copied through from the live bucket, if present. */
  shortName?: string;
  group?: string;
}

export interface CngTaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: CngTask[];
  upcomingTasks: CngTask[];
  importantTasks: CngTask[];
}

export type CngProjectStatus =
  | "ON_TRACK"
  | "NEEDS_ATTENTION"
  | "CRITICAL"
  | "COMPLETE"
  | "DATA_INSUFFICIENT";

export interface CngProjectReadiness {
  /** Buckets currently at 100% — shown as a supporting stat, no longer what readiness is based on. */
  completedPhaseCount: number;
  totalPhaseCount: number;
  /** Weighted average of every bucket's own completion %. null only when DATA_INSUFFICIENT. */
  percentage: number | null;
  status: CngProjectStatus;
}

export interface CngDataIntegrity {
  connectionStatus: CngConnectionStatus;
  hasTasks: boolean;
  /** Tasks whose bucket couldn't be matched to a live Planner bucket. */
  unknownBucketTaskCount: number;
  /** Assignees that couldn't be resolved to a known team member. */
  unmappedUserCount: number;
}

/* ============================================================
   TEAM PERFORMANCE TYPES (Phase 4)
   ============================================================ */

/**
 * Per-team-member workload/progress snapshot. A task with multiple
 * assignees contributes to every assignee's record here — see
 * calculateTeamMemberPerformance in lib/cng/calculations.ts.
 * completionRate is null (never 0) when totalTasks is 0.
 */
export interface TeamMemberPerformance {
  userId: string;
  name: string;
  role?: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  activeTasks: number;
  completionRate: number | null;
}

/**
 * Team-wide totals. Unlike TeamMemberPerformance, these are computed
 * over unique Planner tasks — a multi-assignee task is never counted
 * twice here even though it appears in more than one member's record.
 */
export interface TeamPerformanceSummary {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  overdueTasks: number;
  activeTasks: number;
  unassignedTasks: number;
  completionRate: number | null;
}

export interface CngTeamPerformance {
  summary: TeamPerformanceSummary;
  members: TeamMemberPerformance[];
  /** Tasks with zero assignees, rolled up the same way as a member record. */
  unassigned: TeamMemberPerformance;
}