import type { CngIntelligenceSummary as CngIntelligenceSummaryData } from "@/lib/cng/intelligence";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import styles from "./CngIntelligenceSummary.module.css";

interface SummaryMetric {
  key: keyof CngIntelligenceSummaryData;
  label: string;
  description: string;
}

/**
 * Static metric metadata (labels/descriptions only — never values).
 * Property keys are taken directly from CngIntelligenceSummary in
 * lib/cng/intelligence.ts, per the Phase 8A contract.
 */
const METRICS: SummaryMetric[] = [
  {
    key: "activeTasks",
    label: "Active Work",
    description: "Current incomplete Planner tasks",
  },
  {
    key: "overdueTasks",
    label: "Overdue",
    description: "Active tasks past due date",
  },
  {
    key: "dueSoonTasks",
    label: "Due Soon",
    description: "Active tasks due within 7 days",
  },
  {
    key: "highPriorityActiveTasks",
    label: "High Priority",
    description: "Critical or high-priority active tasks",
  },
  {
    key: "unassignedActiveTasks",
    label: "Unassigned",
    description: "Active tasks without an owner",
  },
  {
    key: "activeTasksWithoutDueDate",
    label: "No Due Date",
    description: "Active tasks without a recorded deadline",
  },
];

export interface CngIntelligenceSummaryProps {
  summary?: CngIntelligenceSummaryData;
}

export function CngIntelligenceSummary({ summary }: CngIntelligenceSummaryProps) {
  if (!summary) {
    return (
      <section className={styles.summary} aria-label="Intelligence summary">
        <h2 className={styles.heading}>Operational Snapshot</h2>
        <DataUnavailable
          label="INTELLIGENCE SUMMARY UNAVAILABLE"
          detail="No summary data has been produced for the current Planner dataset."
        />
      </section>
    );
  }

  return (
    <section className={styles.summary} aria-label="Intelligence summary">
      <h2 className={styles.heading}>Operational Snapshot</h2>
      <div className={styles.grid}>
        {METRICS.map((metric) => (
          <div key={metric.key} className={styles.metric}>
            <h3 className={styles.label}>{metric.label}</h3>
            <p className={styles.value}>{summary[metric.key]}</p>
            <p className={styles.description}>{metric.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
