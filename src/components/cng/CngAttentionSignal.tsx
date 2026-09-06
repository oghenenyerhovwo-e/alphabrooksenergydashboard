import type { CngAttentionSignal as CngAttentionSignalData } from "@/lib/cng/calculations";
import styles from "./CngAttentionSignal.module.css";

export function CngAttentionSignal({ signal }: { signal: CngAttentionSignalData }) {
  return (
    <section className={styles.wrap} data-tone={signal.tone}>
      <div className={styles.title}>{signal.title}</div>
      <p className={styles.detail}>{signal.detail}</p>
    </section>
  );
}