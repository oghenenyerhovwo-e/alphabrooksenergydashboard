import { resolveUserName, resolveUserRole } from "@/config/users";
import { BUCKET_CONFIG } from "@/config/buckets";
import type {
  CngBucket,
  CngTask,
  CngUser,
  RawPlannerBucket,
  RawPlannerTask,
  RawGraphUser,
} from "@/types/cng";

/** Thrown when raw Graph data can't be converted into the app's normalized models. */
export class CngNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CngNormalizationError";
  }
}

const UPCOMING_WINDOW_DAYS = 7;

function normalizeStatus(percentComplete: number): CngTask["status"] {
  if (percentComplete >= 100) return "completed";
  if (percentComplete > 0) return "in-progress";
  return "not-started";
}

/**
 * Planner priority is 0–10. Mapped to the coarse buckets Planner's own
 * UI uses: 0–1 Urgent, 2–4 Important, 5–6 Medium, 7–10 Low.
 */
function normalizePriority(priority?: number): string | undefined {
  if (priority === undefined || priority === null) return undefined;
  if (priority <= 1) return "urgent";
  if (priority <= 4) return "important";
  if (priority <= 6) return "medium";
  return "low";
}

/** Uses raw ISO-8601 UTC timestamp comparison — never the browser's local timezone. */
function computeIsOverdue(
  dueDate: string | undefined,
  status: CngTask["status"],
  nowMs: number
): boolean {
  if (!dueDate || status === "completed") return false;
  const due = Date.parse(dueDate);
  if (Number.isNaN(due)) return false;
  return due < nowMs;
}

function computeIsUpcoming(
  dueDate: string | undefined,
  status: CngTask["status"],
  nowMs: number
): boolean {
  if (!dueDate || status === "completed") return false;
  const due = Date.parse(dueDate);
  if (Number.isNaN(due)) return false;
  const windowMs = UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return due >= nowMs && due <= nowMs + windowMs;
}

/**
 * Builds a CngBucket straight from the live Graph bucket — id, name,
 * and orderHint all come from the API. BUCKET_CONFIG only ever adds an
 * optional shortName/group; it never filters or invents buckets.
 */
function normalizeBucket(raw: RawPlannerBucket): CngBucket {
  const config = BUCKET_CONFIG[raw.id];
  return {
    id: raw.id,
    name: raw.name,
    orderHint: raw.orderHint,
    shortName: config?.shortName,
    group: config?.group,
  };
}

function normalizeUser(userId: string, graphUsersById: Map<string, RawGraphUser>): CngUser {
  const graphUser = graphUsersById.get(userId);
  const { name, isUnmapped } = resolveUserName(userId, graphUser?.displayName);
  const role = resolveUserRole(userId);
  return { id: userId, name, role, isUnmapped: isUnmapped || undefined };
}

function normalizeTask(
  raw: RawPlannerTask,
  bucketsById: Map<string, CngBucket>,
  graphUsersById: Map<string, RawGraphUser>,
  nowMs: number
): CngTask {
  const bucket = bucketsById.get(raw.bucketId);
  const status = normalizeStatus(raw.percentComplete ?? 0);

  const assigneeIds = raw.assignments ? Object.keys(raw.assignments) : [];
  const assignees = assigneeIds.map((id) => {
    const user = normalizeUser(id, graphUsersById);
    return { id: user.id, name: user.name, role: user.role };
  });

  return {
    id: raw.id,
    title: raw.title || "(Untitled task)",
    bucket: bucket
      ? { id: bucket.id, name: bucket.name }
      : { id: raw.bucketId, name: "Unknown Bucket" },
    assignees,
    progress: raw.percentComplete ?? 0,
    status,
    priority: normalizePriority(raw.priority),
    startDate: raw.startDateTime,
    dueDate: raw.dueDateTime,
    completedDate: raw.completedDateTime,
    isOverdue: computeIsOverdue(raw.dueDateTime, status, nowMs),
    isUpcoming: computeIsUpcoming(raw.dueDateTime, status, nowMs),
  };
}

export interface NormalizedCngData {
  tasks: CngTask[];
  buckets: CngBucket[];
  users: CngUser[];
}

/**
 * Converts raw Microsoft Graph Planner data into the application's
 * normalized models. Deterministic given the same inputs and `now`.
 * Buckets are sorted by Planner's own orderHint (lexicographic string
 * compare — that's how Planner's sort keys are designed to be compared)
 * so the app's bucket order always matches what's seen in Planner's UI,
 * with zero manual config.
 */
export function normalizeCngData(
  raw: { buckets: RawPlannerBucket[]; tasks: RawPlannerTask[]; users: RawGraphUser[] },
  now: Date = new Date()
): NormalizedCngData {
  try {
    const nowMs = now.getTime();

    const buckets = raw.buckets
      .map(normalizeBucket)
      .sort((a, b) => (a.orderHint ?? "").localeCompare(b.orderHint ?? ""));
    const bucketsById = new Map(buckets.map((b) => [b.id, b]));

    const graphUsersById = new Map(raw.users.map((u) => [u.id, u]));

    const tasks = raw.tasks.map((t) => normalizeTask(t, bucketsById, graphUsersById, nowMs));

    // Users list = every distinct assignee that actually appears on a
    // task, resolved through the same priority chain used per-task.
    const seenUserIds = new Set<string>();
    const users: CngUser[] = [];
    for (const task of tasks) {
      for (const assignee of task.assignees) {
        if (!seenUserIds.has(assignee.id)) {
          seenUserIds.add(assignee.id);
          users.push(normalizeUser(assignee.id, graphUsersById));
        }
      }
    }
    users.sort((a, b) => a.name.localeCompare(b.name));

    return { tasks, buckets, users };
  } catch (e) {
    console.error("[CNG Normalize] failed:", e);
    throw new CngNormalizationError("Failed to normalize Microsoft Graph Planner data.");
  }
}