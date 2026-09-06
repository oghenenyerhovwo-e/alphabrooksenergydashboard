"use client";

import { useEffect, useRef } from "react";
import { TaskStatusBadge, TaskPriorityBadge, TaskDeadlineBadge } from "./CngTaskBadges";
import type { ExplorerTask } from "./CngTaskTable";
import styles from "./CngTaskDetail.module.css";

interface TaskDetailProps {
  task: ExplorerTask;
  today: Date;
  onClose: () => void;
}

export function CngTaskDetail({ task, today, onClose }: TaskDetailProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`Task details: ${task.title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>{task.title}</h2>
          <button ref={closeRef} type="button" className={styles.closeButton} onClick={onClose} aria-label="Close task details">
            ✕
          </button>
        </div>

        <div className={styles.badgeRow}>
          <TaskStatusBadge status={task.status} />
          <TaskPriorityBadge priority={task.priority} />
        </div>

        <div className={styles.section}>
          <span className={styles.fieldLabel}>Progress</span>
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                data-complete={task.status === "completed"}
                style={{ width: `${Math.max(0, Math.min(100, task.progress))}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{Math.max(0, Math.min(100, task.progress))}%</span>
          </div>
        </div>

        <div className={styles.grid}>
          <Field label="Bucket" value={task.bucket.name} />
          <Field
            label="Assignees"
            value={task.assignees.length > 0 ? task.assignees.map((a) => a.name).join(", ") : "Unassigned"}
            muted={task.assignees.length === 0}
          />
          <Field label="Start Date" value={task.startDate ? formatDate(task.startDate) : "—"} />
          <Field label="Completed Date" value={task.completedDate ? formatDate(task.completedDate) : "—"} />
        </div>

        <div className={styles.section}>
          <span className={styles.fieldLabel}>Deadline</span>
          <TaskDeadlineBadge tone={task.deadlineTone} dueDate={task.dueDate} daysOverdue={task.daysOverdue} today={today} />
        </div>

        <div className={styles.footer}>
          <span className={styles.taskId}>Task ID: {task.id}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue} data-muted={muted}>
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}