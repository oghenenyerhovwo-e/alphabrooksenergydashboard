"use client";

import type { CngDeadlineTask } from "@/lib/cng/calculations";
import { formatCalendarDate, formatOverdueLabel } from "@/lib/cng/calculations";
import styles from "./CngDeadlineTable.module.css";

const CATEGORY_LABEL: Record<CngDeadlineTask["deadlineCategory"], string> = {
  overdue: "OVERDUE",
  "due-today": "DUE TODAY",
  "due-soon": "DUE SOON",
  upcoming: "UPCOMING",
  "no-due-date": "NO DUE DATE",
};

const STATUS_LABEL: Record<CngDeadlineTask["status"], string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  completed: "Completed",
};

export function CngDeadlineTable({ tasks, today }: { tasks: CngDeadlineTask[]; today: Date }) {
  if (tasks.length === 0) {
    return <p className={styles.empty}>No deadlines match the current filter.</p>;
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Deadline</th>
            <th>Task</th>
            <th>Bucket</th>
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
              <td>
                <span className={styles.categoryBadge} data-category={task.deadlineCategory}>
                  {CATEGORY_LABEL[task.deadlineCategory]}
                </span>
                <div className={styles.dateLine}>
                  {task.deadlineCategory === "overdue" && task.daysOverdue
                    ? formatOverdueLabel(task.daysOverdue)
                    : task.dueDate
                    ? formatCalendarDate(task.dueDate, today)
                    : "—"}
                </div>
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
              <td>{STATUS_LABEL[task.status]}</td>
              <td>{task.priority ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}