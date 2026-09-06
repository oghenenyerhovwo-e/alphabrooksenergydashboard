import type { CngTaskMetrics } from "@/types/cng";
import styles from "./CngTaskSummary.module.css";

export interface CngTaskSummaryExtra {
  activeTasks: number;
  unassignedTasks: number;
  dueSoonTasks: number;
}

export function CngTaskSummary({
  taskMetrics,
  extra,
}: {
  taskMetrics: CngTaskMetrics;
  /** Optional — when provided, renders the fuller Phase 7 tile set. Omit to keep prior (4-tile) behavior. */
  extra?: CngTaskSummaryExtra;
}) {
  const overdueCount = taskMetrics.overdueTasks.length;

  const baseItems: { label: string; value: number; tone?: "critical" | "warning" }[] = [
    { label: "Total tasks", value: taskMetrics.totalTasks },
    { label: "Completed", value: taskMetrics.completedTasks },
    { label: "Overdue", value: overdueCount, tone: overdueCount > 0 ? "critical" : undefined },
    { label: "Upcoming", value: taskMetrics.upcomingTasks.length },
  ];

  const items = extra
    ? [
        { label: "Total tasks", value: taskMetrics.totalTasks },
        { label: "Completed", value: taskMetrics.completedTasks },
        { label: "In Progress", value: taskMetrics.inProgressTasks },
        { label: "Not Started", value: taskMetrics.notStartedTasks },
        { label: "Overdue", value: overdueCount, tone: overdueCount > 0 ? ("critical" as const) : undefined },
        { label: "Active Tasks", value: extra.activeTasks },
        {
          label: "Unassigned",
          value: extra.unassignedTasks,
          tone: extra.unassignedTasks > 0 ? ("warning" as const) : undefined,
        },
        {
          label: "Due Soon",
          value: extra.dueSoonTasks,
          tone: extra.dueSoonTasks > 0 ? ("warning" as const) : undefined,
        },
      ]
    : baseItems;

  return (
    <section className={styles.grid}>
      {items.map((item) => (
        <div key={item.label} className={styles.card} data-tone={item.tone}>
          <div className={styles.value}>{item.value}</div>
          <div className={styles.label}>{item.label}</div>
        </div>
      ))}
    </section>
  );
}