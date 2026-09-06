import styles from "./CngPerformanceProgress.module.css";

interface PerformanceProgressProps {
  value: number | null;
  ariaLabel: string;
}

/**
 * Horizontal completion indicator. Renders "No tasks" instead of a 0%
 * bar when value is null — zero assigned tasks is not zero performance.
 */
export function PerformanceProgress({ value, ariaLabel }: PerformanceProgressProps) {
  if (value === null) {
    return <span className={styles.noData}>No tasks</span>;
  }

  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div className={styles.fill} style={{ width: `${value}%` }} />
      </div>
      <span className={styles.pct}>{value}%</span>
    </div>
  );
}