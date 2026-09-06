import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import type { CngProjectReadiness } from "@/types/cng";
import styles from "./CngReadinessOverview.module.css";

export function CngReadinessOverview({ readiness }: { readiness: CngProjectReadiness }) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroLabel}>Project Readiness</div>
      <ReadinessGauge value={readiness.percentage} status={readiness.status} size="lg" />
      <p className={styles.heroSub}>
        {readiness.percentage === null
          ? "Not enough data to calculate readiness yet."
          : `${readiness.completedPhaseCount} of ${readiness.totalPhaseCount} buckets fully complete · ${readiness.percentage}% weighted progress overall.`}
      </p>
    </section>
  );
}