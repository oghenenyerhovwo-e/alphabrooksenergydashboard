import type { CngBucketOverviewSummary } from "@/lib/cng/calculations";
import styles from "./CngBucketSummary.module.css";

interface CngBucketSummaryProps {
  summary: CngBucketOverviewSummary;
}

/**
 * Top-of-page aggregate metrics for Bucket / Phase Metrics. Every value
 * is a plain count derived from calculateBucketOverviewSummary — no
 * percentages are computed here, so there is nothing to fake.
 */
export function CngBucketSummary({ summary }: CngBucketSummaryProps) {
  const cards: { label: string; value: number; tone?: "warning" | "critical" }[] = [
    { label: "Total Tasks", value: summary.totalTasks },
    { label: "Populated Buckets", value: summary.populatedBucketCount },
    { label: "Empty Buckets", value: summary.emptyBucketCount, tone: summary.emptyBucketCount > 0 ? "warning" : undefined },
    { label: "Active Tasks", value: summary.activeTasks },
    { label: "Completed Tasks", value: summary.completedTasks },
    { label: "Overdue Tasks", value: summary.overdueTasks, tone: summary.overdueTasks > 0 ? "critical" : undefined },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <div key={card.label} className={styles.card}>
          <span
            className={styles.value}
            data-tone={card.tone}
          >
            {card.value}
          </span>
          <span className={styles.label}>{card.label}</span>
        </div>
      ))}
    </div>
  );
}