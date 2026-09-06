import type { CngDeadlineSummary as CngDeadlineSummaryData } from "@/lib/cng/calculations";
import styles from "./CngDeadlineSummary.module.css";

type Tone = "critical" | "warning" | "info" | "neutral";

const CARDS: { key: keyof CngDeadlineSummaryData; label: string; tone: Tone }[] = [
  { key: "overdue", label: "Overdue", tone: "critical" },
  { key: "dueToday", label: "Due Today", tone: "warning" },
  { key: "dueSoon", label: "Due Soon", tone: "info" },
  { key: "upcoming", label: "Upcoming", tone: "neutral" },
  { key: "noDueDate", label: "No Due Date", tone: "neutral" },
];

export function CngDeadlineSummary({ summary }: { summary: CngDeadlineSummaryData }) {
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