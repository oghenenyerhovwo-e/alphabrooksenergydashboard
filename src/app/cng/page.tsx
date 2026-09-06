"use client";

import { useMemo } from "react";
import { useCngData } from "@/context/CngDataContext";
import { calculateCngOverview } from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngReadinessOverview } from "@/components/cng/CngReadinessOverview";
import { CngTaskSummary } from "@/components/cng/CngTaskSummary";
import { CngPhaseSummary } from "@/components/cng/CngPhaseSummary";
import { CngAttentionSignal } from "@/components/cng/CngAttentionSignal";
import styles from "./page.module.css";

export default function CngOverviewPage() {
  const { tasks, buckets, users, loading, error, status, lastUpdated, refresh } = useCngData();

  const overview = useMemo(
    () => calculateCngOverview(tasks, buckets, users, status ?? "not_connected"),
    [tasks, buckets, users, status]
  );

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading CNG operations data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load CNG data: ${error}`} />
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
        <h1 className={styles.pageTitle}>CNG Operations</h1>
        <div className={styles.meta}>
          <span>Last updated: {lastUpdated ?? "—"}</span>
          <button className={styles.refresh} onClick={refresh}>
            Refresh data
          </button>
        </div>
      </div>

      <CngReadinessOverview readiness={overview.readiness} />

      {isEmpty ? (
        <div className={styles.emptyState}>
          <DataUnavailable detail="Connected to Planner, but no CNG tasks are available yet." />
        </div>
      ) : (
        <>
          <CngTaskSummary taskMetrics={overview.taskMetrics} />
          <CngPhaseSummary phases={overview.phaseMetrics} />
          <CngAttentionSignal signal={overview.attentionSignal} />
        </>
      )}
    </div>
  );
}