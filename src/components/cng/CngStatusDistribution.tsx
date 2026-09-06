import styles from "./CngStatusDistribution.module.css";

interface StatusDistributionProps {
  completed: number;
  inProgress: number;
  notStarted: number;
}

/**
 * Compact segmented bar showing the completed/in-progress/not-started
 * split for a task set. Status is never conveyed by color alone — the
 * aria-label spells out every count, and each segment carries a title.
 */
export function StatusDistribution({ completed, inProgress, notStarted }: StatusDistributionProps) {
  const total = completed + inProgress + notStarted;

  if (total === 0) {
    return <span className={styles.empty}>—</span>;
  }

  const label = `Completed ${completed}, in progress ${inProgress}, not started ${notStarted}`;

  return (
    <div className={styles.bar} role="img" aria-label={label}>
      {completed > 0 && (
        <div
          className={styles.completed}
          style={{ width: `${(completed / total) * 100}%` }}
          title={`Completed: ${completed}`}
        />
      )}
      {inProgress > 0 && (
        <div
          className={styles.inProgress}
          style={{ width: `${(inProgress / total) * 100}%` }}
          title={`In progress: ${inProgress}`}
        />
      )}
      {notStarted > 0 && (
        <div
          className={styles.notStarted}
          style={{ width: `${(notStarted / total) * 100}%` }}
          title={`Not started: ${notStarted}`}
        />
      )}
    </div>
  );
}