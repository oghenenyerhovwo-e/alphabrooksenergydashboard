"use client";

import type { CngTask } from "@/types/cng";
import { TaskStatusBadge, TaskPriorityBadge, TaskDeadlineBadge, type TaskDeadlineTone } from "./CngTaskBadges";
import styles from "./CngTaskTable.module.css";

export interface ExplorerTask extends CngTask {
  deadlineTone: TaskDeadlineTone;
  daysOverdue?: number;
}

interface TaskTableProps {
  tasks: ExplorerTask[];
  today: Date;
  onSelectTask: (taskId: string) => void;
}

export function CngTaskTable({ tasks, today, onSelectTask }: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No matching tasks</p>
        <p className={styles.emptyDetail}>Try clearing one or more filters.</p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Status</th>
            <th scope="col">Priority</th>
            <th scope="col">Bucket</th>
            <th scope="col">Assignee</th>
            <th scope="col">Start Date</th>
            <th scope="col">Due Date</th>
            <th scope="col">Progress</th>
            <th scope="col" className={styles.visuallyHidden}>
              Details
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={styles.row} onClick={() => onSelectTask(task.id)}>
              <td className={styles.taskCell}>
                <button
                  type="button"
                  className={styles.taskTitleBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTask(task.id);
                  }}
                >
                  {task.title}
                </button>
              </td>
              <td>
                <TaskStatusBadge status={task.status} />
              </td>
              <td>
                <TaskPriorityBadge priority={task.priority} />
              </td>
              <td className={styles.bucketCell}>{task.bucket.name}</td>
              <td className={styles.assigneeCell}>
                {task.assignees.length > 0 ? (
                  task.assignees.map((a) => a.name).join(", ")
                ) : (
                  <span className={styles.unassigned}>Unassigned</span>
                )}
              </td>
              <td className={styles.dateCell}>{task.startDate ? formatDate(task.startDate) : "—"}</td>
              <td>
                <TaskDeadlineBadge tone={task.deadlineTone} dueDate={task.dueDate} daysOverdue={task.daysOverdue} today={today} />
              </td>
              <td className={styles.progressCell}>
                <ProgressBar progress={task.progress} status={task.status} />
              </td>
              <td className={styles.chevronCell} aria-hidden="true">
                ›
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ProgressBar({ progress, status }: { progress: number; status: CngTask["status"] }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} data-complete={status === "completed"} style={{ width: `${clamped}%` }} />
      </div>
      <span className={styles.progressLabel}>{clamped}%</span>
    </div>
  );
}