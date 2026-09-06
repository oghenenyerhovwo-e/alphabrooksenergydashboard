import type { CngAttentionSummary as CngAttentionSummaryData } from "@/lib/cng/calculations";
import styles from "./CngAttentionSummary.module.css";

type Tone = "critical" | "warning" | "info" | "neutral";

const CARDS: { key: keyof CngAttentionSummaryData; label: string; tone: Tone }[] = [
  { key: "totalAttentionTasks", label: "Total Attention Items", tone: "neutral" },
  { key: "overdue", label: "Overdue", tone: "critical" },
  { key: "dueToday", label: "Due Today", tone: "warning" },
  { key: "highPriority", label: "High Priority", tone: "warning" },
  { key: "unassigned", label: "Unassigned", tone: "info" },
  { key: "noDueDate", label: "No Due Date", tone: "neutral" },
];

export function CngAttentionSummary({ summary }: { summary: CngAttentionSummaryData }) {
  return (
    <div className={styles.grid}>
      {CARDS.map((card) => (
        <div key={card.key} className={styles.card} data-tone={card.tone}>
          <div className={styles.value}>{summary[card.key]}</div>
          <div className={styles.label}>{card.label}</div>
        </div>
      ))}
    </div>
  );
}