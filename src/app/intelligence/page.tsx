"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCngData } from "@/context/CngDataContext";
import { buildCngIntelligence } from "@/lib/cng/intelligence";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngIntelligenceSummary } from "@/components/cng/CngIntelligenceSummary";
import { CngIntelligenceSignals } from "@/components/cng/CngIntelligenceSignals";
import styles from "./page.module.css";

const MAX_CONCENTRATION_ROWS = 5;

export default function CngIntelligencePage() {
  const { tasks, loading, error, status, lastUpdated, refresh } = useCngData();

  // Stable reference date for this render pass — mirrors the `today`
  // pattern already used in /cng/tasks. The intelligence engine itself
  // is deterministic given (tasks, referenceDate).
  const referenceDate = useMemo(() => new Date(), []);

  const intelligence = useMemo(
    () => buildCngIntelligence(tasks, referenceDate),
    [tasks, referenceDate]
  );

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading intelligence…</p>
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

  const topBuckets = intelligence.concentration.byBucket.slice(0, MAX_CONCENTRATION_ROWS);
  const topAssignees = intelligence.concentration.byAssignee.slice(0, MAX_CONCENTRATION_ROWS);
  const hasConcentrationData = topBuckets.length > 0 || topAssignees.length > 0;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>CNG Operations</span>
          <h1 className={styles.pageTitle}>CNG Intelligence</h1>
          <p className={styles.pageSubtitle}>
            Operational visibility across the current CNG delivery workload. Evidence-based
            signals derived from live Planner activity, deadlines, priority, assignment, and
            execution status.
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
          <CngIntelligenceSummary summary={intelligence.summary} />

          <CngIntelligenceSignals signals={intelligence.signals} />

          {hasConcentrationData && (
            <section className={styles.concentration} aria-label="Workload concentration">
              <h2 className={styles.sectionHeading}>Workload Concentration</h2>
              <p className={styles.sectionSubtext}>
                Distribution of current active work across Planner buckets and assignees.
              </p>

              <div className={styles.concentrationGrid}>
                <div className={styles.concentrationColumn}>
                  <h3 className={styles.columnLabel}>By Bucket</h3>
                  {topBuckets.length === 0 ? (
                    <p className={styles.columnEmpty}>No active work to distribute.</p>
                  ) : (
                    <ul className={styles.concentrationList}>
                      {topBuckets.map((entry) => (
                        <li key={entry.bucketId} className={styles.concentrationRow}>
                          <span className={styles.rowName}>{entry.bucketName}</span>
                          <span className={styles.rowStat}>
                            {entry.activeTaskCount} · {entry.percentageOfActive}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.concentrationColumn}>
                  <h3 className={styles.columnLabel}>By Assignee</h3>
                  {topAssignees.length === 0 ? (
                    <p className={styles.columnEmpty}>No active work is currently assigned.</p>
                  ) : (
                    <ul className={styles.concentrationList}>
                      {topAssignees.map((entry) => (
                        <li key={entry.userId} className={styles.concentrationRow}>
                          <span className={styles.rowName}>{entry.name}</span>
                          <span className={styles.rowStat}>
                            {entry.activeTaskCount} · {entry.percentageOfActive}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className={styles.explorerAction}>
            <div>
              <h2 className={styles.sectionHeading}>Task-Level Detail</h2>
              <p className={styles.sectionSubtext}>
                Inspect the individual tasks behind these signals in the full task explorer.
              </p>
            </div>
            <Link href="/cng/tasks" className={styles.explorerLink}>
              Open Task Explorer
            </Link>
          </div>
        </>
      )}
    </div>
  );
}