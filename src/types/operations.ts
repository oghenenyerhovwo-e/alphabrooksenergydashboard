/**
 * MAIN OPERATIONS — DAILY TEAM REPORT TYPES
 *
 * Main Operations has its own Microsoft Planner plan and its own normalized
 * data contract. It deliberately does not reuse CNG business types, but it
 * mirrors CNG's normalization shape (bucket carries optional shortName/group,
 * tasks carry a full bucket object, assignees carry role) so both plans are
 * normalized the same way.
 *
 * The raw Planner/Graph layer is responsible for retrieving the Main
 * Operations plan. This type layer describes the normalized data that is
 * safe for the rest of the application to consume.
 */

export type OperationsConnectionStatus = "connected" | "not_connected" | "error";

export type OperationsTaskStatus =
  | "not-started"
  | "in-progress"
  | "completed";

/* ============================================================
   NORMALIZED USERS
   ============================================================ */

export interface OperationsUser {
  id: string;
  name: string;
  role?: string;
  isUnmapped?: boolean;
}

/* ============================================================
   NORMALIZED BUCKETS
   ============================================================ */

export interface OperationsBucket {
  id: string;
  name: string;
  orderHint: string;
  /** Optional cosmetic label from config/buckets.ts (OPERATIONS_BUCKET_CONFIG). Never required. */
  shortName?: string;
  /** Optional role/department label from config/buckets.ts. This is what makes a Planner bucket act as a "role bucket". */
  group?: string;
}

/* ============================================================
   TASK ASSIGNEES
   ============================================================ */

export interface OperationsAssignee {
  id: string;
  name: string;
  role?: string;
  isUnmapped?: boolean;
}

/**
 * The UPDATE / BLOCKER / NEXT parts of a Planner task's Notes.
 *
 * Each section is null when that section does not exist.
 * The original Notes text remains available through OperationsTask.notes.
 */
export interface OperationsTaskNoteSections {
  update: string | null;
  blocker: string | null;
  next: string | null;
}

/* ============================================================
   NORMALIZED TASK
   ============================================================ */

export interface OperationsTask {
  id: string;
  title: string;

  assignees: OperationsAssignee[];

  /** Planner startDateTime. */
  startDate?: string;

  /** Planner dueDateTime. */
  dueDate?: string;

  /** Planner completedDateTime. */
  completedDate?: string;

  /** Raw Planner priority, 0–10. */
  priority?: number;

  percentComplete: number;

  status: OperationsTaskStatus;

  isOverdue: boolean;

  /**
   * The actual Planner bucket attached to this task, fully normalized —
   * id/name come straight from Graph, shortName/group are the optional
   * cosmetic layer from OPERATIONS_BUCKET_CONFIG. This is the single
   * source the Team Tracker groups by.
   */
  bucket: {
    id: string;
    name: string;
    shortName?: string;
    group?: string;
  };

  /**
   * Complete Planner task description/Notes.
   */
  notes: string | null;

  /**
   * Parsed convenience sections from the original Notes.
   */
  noteSections: OperationsTaskNoteSections;

  /**
   * Deterministically extracted BLOCKER entries.
   */
  blockers: string[];
}

/* ============================================================
   EMPLOYEE SUMMARY
   ============================================================ */

export interface OperationsEmployeeSummary {
  userId: string;
  name: string;
  role?: string;

  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;

  /**
   * null when the employee has no assigned tasks.
   */
  completionPercentage: number | null;

  overdueTasks: OperationsTask[];

  blockers: {
    taskTitle: string;
    text: string;
  }[];

  tasks: OperationsTask[];
}

/* ============================================================
   OVERALL SUMMARY
   ============================================================ */

export interface OperationsOverallSummary {
  totalUniqueTasks: number;
  completedUniqueTasks: number;
  completionPercentage: number | null;
}

/* ============================================================
   GLOBAL MAIN OPERATIONS DATA
   ============================================================ */

export interface OperationsTeamData {
  status: OperationsConnectionStatus;
  message?: string;

  lastUpdated: string | null;

  /**
   * Every Main Operations Planner bucket returned by Microsoft Graph.
   *
   * No bucket IDs are invented here.
   */
  buckets: OperationsBucket[];

  /**
   * Every Graph user actually resolved from Planner assignments.
   */
  users: OperationsUser[];

  /**
   * Every normalized Planner task.
   */
  tasks: OperationsTask[];

  /**
   * Employee-oriented view of the same normalized task set.
   */
  employees: OperationsEmployeeSummary[];

  /**
   * Tasks without Planner assignees.
   */
  unassignedTasks: OperationsTask[];

  overall: OperationsOverallSummary;
}

/* ============================================================
   HISTORICAL / SNAPSHOT COMPATIBILITY
   ============================================================ */

/**
 * Raw Planner task-details response.
 */
export interface RawPlannerTaskDetails {
  id: string;
  description?: string;
}