import type { CngIntelligenceSignal } from "@/lib/cng/intelligence";
import styles from "./CngIntelligenceSignals.module.css";

const MAX_TITLE_PREVIEW = 3;

export interface CngIntelligenceSignalsProps {
  signals?: CngIntelligenceSignal[];
}

export function CngIntelligenceSignals({ signals }: CngIntelligenceSignalsProps) {
  const list = signals ?? [];

  if (list.length === 0) {
    return (
      <section className={styles.wrapper} aria-label="Operational signals">
        <h2 className={styles.heading}>Operational Signals</h2>
        <div className={styles.empty}>
          <p className={styles.emptyLabel}>NO CURRENT OPERATIONAL SIGNALS</p>
          <p className={styles.emptyText}>
            The current Planner dataset does not produce any defined intelligence signals.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.wrapper} aria-label="Operational signals">
      <h2 className={styles.heading}>Operational Signals</h2>
      <ul className={styles.list}>
        {list.map((signal) => (
          <li key={signal.id}>
            <SignalCard signal={signal} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SignalCard({ signal }: { signal: CngIntelligenceSignal }) {
  const previewTitles = (signal.affectedTaskTitles ?? []).slice(0, MAX_TITLE_PREVIEW);
  const taskWord = signal.affectedTaskCount === 1 ? "TASK" : "TASKS";

  return (
    <article className={styles.card} data-severity={signal.severity}>
      <span className={styles.severity}>{signal.severity}</span>

      <h3 className={styles.title}>{signal.title}</h3>

      {signal.description && <p className={styles.description}>{signal.description}</p>}

      <div className={styles.body}>
        {signal.evidence && (
          <div className={styles.block}>
            <span className={styles.blockLabel}>Evidence</span>
            <p className={styles.evidence}>{signal.evidence}</p>
          </div>
        )}

        <div className={styles.block}>
          <span className={styles.blockLabel}>Affected Work</span>
          <p className={styles.affectedCount}>
            {signal.affectedTaskCount} {taskWord}
          </p>

          {previewTitles.length > 0 && (
            <ul className={styles.taskPreview}>
              {previewTitles.map((title, index) => (
                <li key={signal.affectedTaskIds?.[index] ?? `${signal.id}-preview-${index}`}>
                  {title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {signal.recommendation && (
          <div className={styles.block}>
            <span className={styles.blockLabel}>Recommendation</span>
            <p className={styles.recommendation}>{signal.recommendation}</p>
          </div>
        )}
      </div>
    </article>
  );
}
