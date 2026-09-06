"use client";

import { useMemo } from "react";
import { useCngData } from "@/context/CngDataContext";
import { calculateTeamPerformance } from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { TeamSummary } from "@/components/cng/CngTeamSummary";
import { TeamPerformanceTable } from "@/components/cng/CngTeamPerformanceTable";
import styles from "./page.module.css";

export default function TeamPerformancePage() {
  const { tasks, users, loading, error, status, lastUpdated, refresh } = useCngData();

  const teamPerformance = useMemo(() => calculateTeamPerformance(tasks, users), [tasks, users]);

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading team performance data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load team performance data: ${error}`} />
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
        <h1 className={styles.pageTitle}>Team Performance</h1>
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
          <TeamSummary summary={teamPerformance.summary} />
          <TeamPerformanceTable
            members={teamPerformance.members}
            unassigned={teamPerformance.unassigned}
          />
        </>
      )}
    </div>
  );
}