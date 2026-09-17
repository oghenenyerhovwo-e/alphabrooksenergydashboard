"use client";

import { useMemo } from "react";
import styles from "./OutcomePerformancePanel.module.css";

type StaffPerformance = {
  user: {
    id: string;
    name: string;
    role: string;
  };

  target: {
    userId: string;
    targetValue: number;
    unit: string;
  } | null;

  achievement: {
    userId: string;
    achievedValue: number;
    unit: string;
  } | null;
};

type OutcomePerformancePanelProps = {
  currentUserId: string;
  isAdmin: boolean;
  product: string;
  year: number;
  month: number;
  staffPerformance: StaffPerformance[];
};

function formatQuantity(value: number) {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 2,
  }).format(value);
}

function percentage(
  value: number,
  total: number
) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(total) || total <= 0) return 0;

  return Math.max(
    0,
    Math.min(100, (value / total) * 100)
  );
}

export function OutcomePerformancePanel({
  currentUserId,
  isAdmin,
  staffPerformance,
}: OutcomePerformancePanelProps) {
  const metrics = useMemo(() => {
    /*
     * Find the currently selected/current user.
     */
    const currentStaff =
      staffPerformance.find(
        (staff) =>
          staff.user.id === currentUserId
      ) ?? null;

    /*
     * Extract the person's actual target.
     */
    const targetValue =
      currentStaff?.target?.targetValue ?? 0;

    /*
     * Extract the person's actual achievement.
     */
    const achievedValue =
      currentStaff?.achievement?.achievedValue ?? 0;

    /*
     * Normalize everything to real numbers.
     */
    const safeTarget = Number.isFinite(
      Number(targetValue)
    )
      ? Number(targetValue)
      : 0;

    const safeAchievement =
      Number.isFinite(
        Number(achievedValue)
      )
        ? Number(achievedValue)
        : 0;

    /*
     * Calculate outstanding balance.
     */
    const outstanding = Math.max(
      0,
      safeTarget - safeAchievement
    );

    /*
     * Individual achievement percentage.
     */
    const achievementPercentage =
      percentage(
        safeAchievement,
        safeTarget
      );

    /*
     * Calculate the TEAM totals from the
     * actual staff performance records.
     */
    const teamTarget =
      staffPerformance.reduce(
        (total, staff) => {
          const value =
            Number(
              staff.target?.targetValue ?? 0
            );

          return (
            total +
            (Number.isFinite(value)
              ? value
              : 0)
          );
        },
        0
      );

    const teamAchievement =
      staffPerformance.reduce(
        (total, staff) => {
          const value =
            Number(
              staff.achievement
                ?.achievedValue ?? 0
            );

          return (
            total +
            (Number.isFinite(value)
              ? value
              : 0)
          );
        },
        0
      );

    /*
     * Overall team achievement.
     */
    const teamPercentage =
      percentage(
        teamAchievement,
        teamTarget
      );

    /*
     * This person's contribution to
     * total team achievement.
     */
    const contributionPercentage =
      teamAchievement > 0
        ? Math.max(
            0,
            Math.min(
              100,
              (safeAchievement /
                teamAchievement) *
                100
            )
          )
        : 0;

    /*
     * Unit should come from the person's
     * target first, then achievement.
     */
    const unit =
      currentStaff?.target?.unit ??
      currentStaff?.achievement?.unit ??
      "";

    return {
      personName:
        currentStaff?.user.name ??
        "Staff Outcome",

      unit,

      target: safeTarget,

      achievement:
        safeAchievement,

      outstanding,

      achievementPercentage,

      teamTarget,

      teamAchievement,

      teamPercentage,

      contributionPercentage,
    };
  }, [
    currentUserId,
    staffPerformance,
  ]);

  const status =
    metrics.achievementPercentage >= 100
      ? "Target reached"
      : metrics.achievementPercentage >= 75
        ? "On track"
        : metrics.achievementPercentage >= 40
          ? "Needs attention"
          : "Behind target";

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <span className={styles.eyebrow}>
            {isAdmin
              ? "STAFF OUTCOME"
              : "YOUR OUTCOME"}
          </span>

          <h2>
            {metrics.personName}
          </h2>

          <p>
            Measurable AGO performance for the
            selected period.
          </p>
        </div>

        <div className={styles.status}>
          <span
            className={styles.statusDot}
          />

          {status}
        </div>
      </div>

      <div className={styles.heroMetric}>
        <div className={styles.progressRing}>
          <svg
            viewBox="0 0 120 120"
            role="img"
            aria-label={`${Math.round(
              metrics.achievementPercentage
            )}% target achievement`}
          >
            <circle
              className={styles.ringTrack}
              cx="60"
              cy="60"
              r="50"
            />

            <circle
              className={styles.ringValue}
              cx="60"
              cy="60"
              r="50"
              pathLength="100"
              style={{
                strokeDasharray: `${metrics.achievementPercentage} 100`,
              }}
            />
          </svg>

          <div className={styles.ringText}>
            <strong>
              {Math.round(
                metrics.achievementPercentage
              )}
              %
            </strong>

            <span>achieved</span>
          </div>
        </div>

        <div className={styles.heroCopy}>
          <span>Actual achievement</span>

          <strong>
            {formatQuantity(
              metrics.achievement
            )}{" "}
            {metrics.unit}
          </strong>

          <small>
            against a target of{" "}
            {formatQuantity(
              metrics.target
            )}{" "}
            {metrics.unit}
          </small>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <article
          className={styles.metricCard}
        >
          <span>Target</span>

          <strong>
            {formatQuantity(
              metrics.target
            )}
          </strong>

          <small>
            {metrics.unit}
          </small>
        </article>

        <article
          className={styles.metricCard}
        >
          <span>Achievement</span>

          <strong>
            {formatQuantity(
              metrics.achievement
            )}
          </strong>

          <small>
            {metrics.unit}
          </small>
        </article>

        <article
          className={`${styles.metricCard} ${styles.outstanding}`}
        >
          <span>Outstanding</span>

          <strong>
            {formatQuantity(
              metrics.outstanding
            )}
          </strong>

          <small>
            {metrics.unit}
          </small>
        </article>
      </div>

      <div className={styles.teamSection}>
        <div className={styles.teamHeader}>
          <div>
            <span
              className={styles.eyebrow}
            >
              TEAM CONTRIBUTION
            </span>

            <h3>
              Your contribution to the team
            </h3>
          </div>

          <strong>
            {Math.round(
              metrics.contributionPercentage
            )}
            %
          </strong>
        </div>

        <div
          className={
            styles.contributionTrack
          }
        >
          <div
            className={
              styles.contributionValue
            }
            style={{
              width: `${metrics.contributionPercentage}%`,
            }}
          />
        </div>

        <div
          className={
            styles.teamNumbers
          }
        >
          <span>
            Team achievement:{" "}
            <strong>
              {formatQuantity(
                metrics.teamAchievement
              )}{" "}
              {metrics.unit}
            </strong>
          </span>

          <span>
            Team target:{" "}
            <strong>
              {formatQuantity(
                metrics.teamTarget
              )}{" "}
              {metrics.unit}
            </strong>
          </span>
        </div>

        <div
          className={
            styles.teamProgress
          }
        >
          <span>
            Overall team target achievement
          </span>

          <strong>
            {Math.round(
              metrics.teamPercentage
            )}
            %
          </strong>
        </div>
      </div>
    </section>
  );
}