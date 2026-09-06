"use client";

import { PieChart, Pie, Cell } from "recharts";
import { DataUnavailable } from "./DataUnavailable";
import styles from "./ReadinessGauge.module.css";

const STATUS_LABELS: Record<string, string> = {
  ON_TRACK: "On track",
  NEEDS_ATTENTION: "Needs attention",
  CRITICAL: "Critical",
  COMPLETE: "Complete",
  DATA_INSUFFICIENT: "Data insufficient",
};

const STATUS_COLORS: Record<string, string> = {
  ON_TRACK: "var(--green)",
  NEEDS_ATTENTION: "var(--amber)",
  CRITICAL: "var(--red)",
  COMPLETE: "var(--green-dark)",
  DATA_INSUFFICIENT: "var(--grey-500)",
};

interface ReadinessGaugeProps {
  value: number | null;
  /** Optional management status (e.g. "ON_TRACK"). Omit for the plain gauge used elsewhere. */
  status?: string;
  /** "lg" makes the gauge visually dominant for a hero placement. Defaults to the existing compact size. */
  size?: "sm" | "lg";
  /** Small label shown above the percentage inside the ring. */
  label?: string;
}

export function ReadinessGauge({ value, status, size = "sm", label }: ReadinessGaugeProps) {
  const dimension = size === "lg" ? 220 : 140;
  const innerRadius = size === "lg" ? 82 : 52;
  const outerRadius = size === "lg" ? 106 : 68;

  if (value === null) {
    return (
      <div className={styles.wrap}>
        <div
          className={styles.ghostRing}
          style={size === "lg" ? { width: 220, height: 220, borderWidth: 22 } : undefined}
        />
        <DataUnavailable detail="Cross-company readiness requires a connected data source." />
      </div>
    );
  }

  const data = [
    { name: "complete", value },
    { name: "remaining", value: 100 - value },
  ];

  const ringColor = status ? STATUS_COLORS[status] ?? "var(--green)" : "var(--green)";
  const statusLabel = status ? STATUS_LABELS[status] ?? status : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.ring} style={{ width: dimension, height: dimension }}>
        <PieChart width={dimension} height={dimension}>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive
          >
            <Cell fill={ringColor} />
            <Cell fill="var(--grey-200)" />
          </Pie>
        </PieChart>
        <div className={styles.centerLabel}>
          {label && <div className={styles.centerLabelSmall}>{label}</div>}
          <div className={size === "lg" ? styles.valueLg : styles.value}>{value}%</div>
        </div>
      </div>
      {statusLabel && (
        <div className={styles.statusBadge} data-tone={status?.toLowerCase()}>
          {statusLabel}
        </div>
      )}
    </div>
  );
}