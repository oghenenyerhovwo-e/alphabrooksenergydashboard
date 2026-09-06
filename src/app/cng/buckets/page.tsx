"use client";

import { useMemo } from "react";
import { useCngData } from "@/context/CngDataContext";
import {
  calculateTaskMetrics,
  calculatePhaseMetrics,
  calculateBucketOverviewSummary,
} from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngBucketSummary } from "@/components/cng/CngBucketSummary";
import { CngBucketTable } from "@/components/cng/CngBucketTable";
import styles from "./page.module.css";

export default function BucketPhaseMetricsPage() {
  const { tasks, buckets, loading, error, status, lastUpdated, refresh } = useCngData();

  const taskMetrics = useMemo(() => calculateTaskMetrics(tasks), [tasks]);
  const phaseMetrics = useMemo(() => calculatePhaseMetrics(tasks, buckets), [tasks, buckets]);
  const summary = useMemo(
    () => calculateBucketOverviewSummary(taskMetrics, phaseMetrics),
    [taskMetrics, phaseMetrics]
  );

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading bucket and phase metrics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load bucket/phase data: ${error}`} />
        <button className={styles.refresh} onClick={refresh}>
          Try again
        </button>
      </div>
    );
  }

  if (status === "not_connected") {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail="The CNG Planner connection isn't set up yet. Connect Microsoft Graph in Settings to bring in live data." />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail="Microsoft Graph reported a problem loading Planner data. Check the connection in Settings." />
        <button className={styles.refresh} onClick={refresh}>
          Try again
        </button>
      </div>
    );
  }

  const isEmpty = status === "connected" && tasks.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Bucket / Phase Metrics</h1>
          <p className={styles.pageSubtitle}>
            How work is progressing across every live CNG Planner bucket — task volume, completion, and overdue attention per bucket.
          </p>
        </div>
        <div className={styles.meta}>
          <span>Last updated: {lastUpdated ?? "—"}</span>
          <button className={styles.refresh} onClick={refresh}>
            Refresh data
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <DataUnavailable detail="Connected to Planner, but no CNG tasks are available yet." />
        </div>
      ) : (
        <>
          <CngBucketSummary summary={summary} />
          <CngBucketTable phaseMetrics={phaseMetrics} />
        </>
      )}
    </div>
  );
}