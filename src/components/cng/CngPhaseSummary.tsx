import { PHASE_STATUS_LABELS } from "@/config/buckets";
import type { CngPhaseMetrics } from "@/types/cng";
import styles from "./CngPhaseSummary.module.css";

export function CngPhaseSummary({ phases }: { phases: CngPhaseMetrics[] }) {
  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>Project phases</h2>
      <div className={styles.list}>
        {phases.map((phase) => (
          <div key={phase.id} className={styles.row} data-status={phase.status}>
            <div className={styles.rowHeader}>
              <span className={styles.name}>{phase.name}</span>
              <span className={styles.status}>{PHASE_STATUS_LABELS[phase.status]}</span>
            </div>

            {phase.status === "NOT_YET_POPULATED" ? (
              <div className={styles.emptyBar} />
            ) : (
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${phase.completionPercentage ?? 0}%` }}
                />
              </div>
            )}

            <div className={styles.meta}>
              {phase.status === "NOT_YET_POPULATED"
                ? "No Planner tasks in this phase yet"
                : `${phase.completedTasks} of ${phase.totalTasks} tasks complete (${phase.completionPercentage}%)`}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}