/**
 * MAIN OPERATIONS — DAILY TEAM REPORT TYPES (Phase 2)
 *
 * Kept separate from src/types/cng.ts on purpose: this is not a CNG
 * feature, and these types encode a different shape (per-employee
 * completion, Notes/blockers) than the CNG bucket/phase model.
 */

/** Raw Planner task-details response, as returned by
 * GET /planner/tasks/{id}/details (and its $batch equivalent). */
export interface RawPlannerTaskDetails {
  id: string;
  description?: string;
}

export type OperationsTaskStatus = "not-started" | "in-progress" | "completed";

export interface OperationsAssignee {
  id: string;
  name: string;
}

export interface OperationsTask {
  id: string;
  title: string;
  assignees: OperationsAssignee[];
  dueDate?: string;
  /** Raw Planner priority, 0 (urgent) – 10 (low). Left unmapped here; the report layer decides how to present it. */
  priority?: number;
  percentComplete: number;
  status: OperationsTaskStatus;
  isOverdue: boolean;
  /** Full raw Notes/Description text from Planner task details, or null if there is none. */
  notes: string | null;
  /** Every "BLOCKER:" line found in `notes`, prefix stripped, in order of appearance. */
  blockers: string[];
}

export interface OperationsEmployeeSummary {
  userId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  /** null (never 0) when totalTasks is 0 — render as "No tasks assigned yet." rather than 0%. */
  completionPercentage: number | null;
  overdueTasks: OperationsTask[];
  blockers: { taskTitle: string; text: string }[];
  tasks: OperationsTask[];
}

export interface OperationsOverallSummary {
  /** Unique Planner tasks — a multi-assignee task is counted once here even though it appears in several employees' `tasks`. */
  totalUniqueTasks: number;
  completedUniqueTasks: number;
  completionPercentage: number | null;
}

export type OperationsConnectionStatus = "connected" | "not_connected" | "error";

export interface OperationsTeamData {
  status: OperationsConnectionStatus;
  message?: string;
  lastUpdated: string | null;
  employees: OperationsEmployeeSummary[];
  /** Tasks with zero Planner assignees — never silently dropped, never attributed to an employee. */
  unassignedTasks: OperationsTask[];
  overall: OperationsOverallSummary;
}