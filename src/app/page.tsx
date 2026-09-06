"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCngData } from "@/context/CngDataContext";
import { calculateCngOverview } from "@/lib/cng/calculations";
import { ReadinessGauge } from "@/components/ui/ReadinessGauge";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import styles from "./page.module.css";
import MilestoneTimer from "@/components/MilestoneTimer/MilestoneTimer";

function formatStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export default function OverviewPage() {
  const { tasks, buckets, users, loading, error, status } = useCngData();

  const overview = useMemo(() => {
    if (!status) return null;
    return calculateCngOverview(tasks, buckets, users, status);
  }, [tasks, buckets, users, status]);

  const cngConnected = status === "connected";
  const cngHasData = cngConnected && tasks.length > 0;
  const hasReadinessPercentage =
    cngHasData && overview !== null && overview.readiness.percentage !== null;

  return (
    <div className={styles.grid}>
      <section className={styles.timer}>
        <MilestoneTimer />
      </section>

      <section className={styles.hero}>
        <div className={styles.heroLabel}>Overall Operations Readiness</div>

        {loading ? (
          <div className={styles.heroLoading}>
            <div className={styles.heroSpinner} />
            <p className={styles.heroNote}>Loading operations readiness…</p>
          </div>
        ) : hasReadinessPercentage && overview ? (
          <ReadinessGauge
            value={overview.readiness.percentage}
            status={overview.readiness.status}
            size="lg"
            label="CNG Readiness"
          />
        ) : (
          <>
            <ReadinessGauge value={null} size="lg" />
            <p className={styles.heroNote}>
              {error
                ? "Couldn't load readiness data."
                : cngConnected
                ? "Connected, but there isn't enough data yet to calculate readiness."
                : "Connect a data source to calculate operations readiness."}
            </p>
          </>
        )}
      </section>

      <Link href="/cng" className={styles.card} aria-label="View CNG Operations">
        <h3 className={styles.cardTitle}>CNG Project Status</h3>

        {loading ? (
          <DataUnavailable label="LOADING" detail="Fetching CNG Planner data…" />
        ) : error ? (
          <DataUnavailable label="ERROR" detail={`Couldn't load CNG data: ${error}`} />
        ) : !cngConnected ? (
          <DataUnavailable detail="Connect Microsoft Graph in Settings to see live CNG status." />
        ) : !cngHasData ? (
          <DataUnavailable
            label="NO TASKS YET"
            detail="Connected, but no CNG tasks are available yet."
          />
        ) : overview && overview.readiness.percentage !== null ? (
          <div className={styles.statusRow}>
            <span className={styles.statusPercentage}>{overview.readiness.percentage}%</span>
            <span
              className={styles.statusPill}
              data-tone={overview.readiness.status.toLowerCase()}
            >
              {formatStatusLabel(overview.readiness.status)}
            </span>
          </div>
        ) : (
          <DataUnavailable detail="Insufficient data to calculate readiness." />
        )}

        <span className={styles.cardLink}>View CNG Operations →</span>
      </Link>

      <Link href="/operations" className={styles.card} aria-label="View Main Operations">
        <h3 className={styles.cardTitle}>Main Operations</h3>
        <DataUnavailable detail="Main Operations data source is not yet connected." />
        <span className={styles.cardLink}>View Main Operations →</span>
      </Link>

      <Link href="/drivers" className={styles.card} aria-label="View Driver Activity">
        <h3 className={styles.cardTitle}>Driver Activity</h3>
        <DataUnavailable detail="Live driver location data is not yet connected." />
        <span className={styles.cardLink}>View Driver Activity →</span>
      </Link>

      <Link href="/cng/attention" className={styles.card} aria-label="View Needs Attention">
        <h3 className={styles.cardTitle}>Needs Attention</h3>

        {loading ? (
          <DataUnavailable label="LOADING" detail="Checking for attention items…" />
        ) : error ? (
          <DataUnavailable label="ERROR" detail="Couldn't load attention signal." />
        ) : !cngConnected ? (
          <DataUnavailable
            label="NO SIGNAL"
            detail="No connected source is reporting attention items yet."
          />
        ) : overview ? (
          <div className={styles.attentionRow} data-tone={overview.attentionSignal.tone}>
            <div className={styles.attentionTitle}>{overview.attentionSignal.title}</div>
            <div className={styles.attentionDetail}>{overview.attentionSignal.detail}</div>
          </div>
        ) : null}

        <span className={styles.cardLink}>View Needs Attention →</span>
      </Link>
    </div>
  );
}