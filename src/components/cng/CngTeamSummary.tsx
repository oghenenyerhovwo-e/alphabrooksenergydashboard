import type { TeamPerformanceSummary } from "@/types/cng";
import styles from "./CngTeamSummary.module.css";

interface TeamSummaryProps {
  summary: TeamPerformanceSummary;
}

/** Single strip of team-wide stats — deliberately not one card per number. */
export function TeamSummary({ summary }: TeamSummaryProps) {
  const items: { label: string; value: string; tone?: "critical" }[] = [
    { label: "Total tasks", value: String(summary.totalTasks) },
    { label: "Completed", value: String(summary.completedTasks) },
    { label: "Active", value: String(summary.activeTasks) },
    {
      label: "Overdue",
      value: String(summary.overdueTasks),
      tone: summary.overdueTasks > 0 ? "critical" : undefined,
    },
    { label: "Unassigned", value: String(summary.unassignedTasks) },
    {
      label: "Completion rate",
      value: summary.completionRate === null ? "No tasks" : `${summary.completionRate}%`,
    },
  ];

  return (
    <section className={styles.card} aria-label="Team-wide performance summary">
      {items.map((item) => (
        <div key={item.label} className={styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={item.tone === "critical" ? styles.valueCritical : styles.value}>
            {item.value}
          </span>
        </div>
      ))}
    </section>
  );
}