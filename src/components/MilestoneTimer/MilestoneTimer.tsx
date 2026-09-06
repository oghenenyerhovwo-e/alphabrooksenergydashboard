"use client";

import { useMilestoneTimer } from "@/hooks/useMilestoneTimer";
import styles from "./MilestoneTimer.module.css";

const DATE_FORMAT_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", DATE_FORMAT_OPTS);
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

export default function MilestoneTimer() {
  const timer = useMilestoneTimer();

  const displayTitle =
    timer.status === "pending"
      ? "Starts Soon"
      : timer.status === "completed"
      ? "Window Complete"
      : timer.title;

  const badgeLabel =
    timer.status === "pending"
      ? "Pending"
      : timer.status === "in-progress"
      ? "In progress"
      : "Completed";

  const badgeClass =
    timer.status === "pending"
      ? styles.badgePending
      : timer.status === "in-progress"
      ? styles.badgeInProgress
      : styles.badgeCompleted;

  return (
    <div className={styles.card}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{displayTitle}</h3>
          <span className={styles.dateRange}>
            {formatDate(timer.startDate)} → {formatDate(timer.endDate)}
          </span>
        </div>
        <span className={`${styles.badge} ${badgeClass}`}>{badgeLabel}</span>
      </div>

      <div className={styles.segments}>
        <div className={styles.segment}>
          <div className={styles.segmentValue} suppressHydrationWarning>{pad2(timer.days)}</div>
          <div className={styles.segmentLabel}>Days</div>
        </div>
        <div className={styles.segment}>
          <div className={styles.segmentValue} suppressHydrationWarning>{pad2(timer.hours)}</div>
          <div className={styles.segmentLabel}>Hrs</div>
        </div>
        <div className={styles.segment}>
          <div className={styles.segmentValue} suppressHydrationWarning>{pad2(timer.minutes)}</div>
          <div className={styles.segmentLabel}>Min</div>
        </div>
        <div className={styles.segment}>
          <div className={styles.segmentValue} suppressHydrationWarning>{pad2(timer.seconds)}</div>
          <div className={styles.segmentLabel}>Sec</div>
        </div>
      </div>
    </div>
  );
}