"use client";

import type { CngTask } from "@/types/cng";
import type { CngDeadlineCategory } from "@/lib/cng/calculations";
import { formatCalendarDate, formatOverdueLabel } from "@/lib/cng/calculations";
import styles from "./CngTaskBadges.module.css";

const STATUS_LABEL: Record<CngTask["status"], string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
};

export function TaskStatusBadge({ status }: { status: CngTask["status"] }) {
  return (
    <span className={styles.statusBadge} data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function priorityTone(priority: string): "urgent" | "important" | "neutral" {
  const lower = priority.toLowerCase();
  if (lower.includes("urgent")) return "urgent";
  if (lower.includes("important")) return "important";
  return "neutral";
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

export function TaskPriorityBadge({ priority }: { priority?: string }) {
  if (!priority) {
    return <span className={styles.noValue}>—</span>;
  }
  return (
    <span className={styles.priorityBadge} data-tone={priorityTone(priority)}>
      {capitalize(priority)}
    </span>
  );
}

export type TaskDeadlineTone = CngDeadlineCategory | "completed";

const DEADLINE_LABEL: Record<TaskDeadlineTone, string> = {
  overdue: "OVERDUE",
  "due-today": "DUE TODAY",
  "due-soon": "DUE SOON",
  upcoming: "UPCOMING",
  "no-due-date": "NO DUE DATE",
  completed: "COMPLETED",
};

export function TaskDeadlineBadge({
  tone,
  dueDate,
  daysOverdue,
  today,
}: {
  tone: TaskDeadlineTone;
  dueDate?: string;
  daysOverdue?: number;
  today: Date;
}) {
  let dateLine: string;
  if (tone === "overdue" && daysOverdue) {
    dateLine = formatOverdueLabel(daysOverdue);
  } else if (dueDate) {
    dateLine = formatCalendarDate(dueDate, today);
  } else {
    dateLine = "—";
  }

  return (
    <div className={styles.deadlineCell}>
      <span className={styles.deadlineBadge} data-tone={tone}>
        {DEADLINE_LABEL[tone]}
      </span>
      <div className={styles.deadlineDate}>{dateLine}</div>
    </div>
  );
}