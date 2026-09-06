"use client";

import type { CngAttentionTask, CngAttentionSignalType } from "@/lib/cng/calculations";
import { formatCalendarDate, formatOverdueLabel } from "@/lib/cng/calculations";
import styles from "./CngAttentionTable.module.css";

const SIGNAL_META: Record<CngAttentionSignalType, { label: string; detail: (t: CngAttentionTask) => string }> = {
  overdue: {
    label: "OVERDUE",
    detail: (t) => (t.daysOverdue ? formatOverdueLabel(t.daysOverdue) : "Past due date"),
  },
  "due-today": {
    label: "DUE TODAY",
    detail: () => "Deadline is today",
  },
  "high-priority": {
    label: "HIGH PRIORITY",
    detail: () => "Still active",
  },
  unassigned: {
    label: "UNASSIGNED",
    detail: () => "No team member assigned",
  },
  "no-due-date": {
    label: "NO DUE DATE",
    detail: () => "Active task has no deadline",
  },
};

const PRIORITY_LABEL: Record<CngAttentionTask["priorityLevel"], string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export function CngAttentionTable({ tasks, today }: { tasks: CngAttentionTask[]; today: Date }) {
  if (tasks.length === 0) {
    return <p className={styles.empty}>No attention items match the current filter.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Priority</th>
            <th>Task</th>
            <th>Bucket</th>
            <th>Assignee</th>
            <th>Signals</th>
            <th>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <span className={styles.priorityBadge} data-priority={task.priorityLevel}>
                  {PRIORITY_LABEL[task.priorityLevel]}
                </span>
              </td>
              <td className={styles.titleCell}>{task.title}</td>
              <td>{task.bucket.name}</td>
              <td>
                {task.assignees.length > 0 ? (
                  task.assignees.map((a) => a.name).join(", ")
                ) : (
                  <span className={styles.unassigned}>Unassigned</span>
                )}
              </td>
              <td>
                <ul className={styles.signalList}>
                  {task.signals.map((signal) => (
                    <li key={signal} className={styles.signalItem} data-signal={signal}>
                      <span className={styles.signalLabel}>{SIGNAL_META[signal].label}</span>
                      <span className={styles.signalDetail}>{SIGNAL_META[signal].detail(task)}</span>
                    </li>
                  ))}
                </ul>
              </td>
              <td>{task.dueDate ? formatCalendarDate(task.dueDate, today) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}