"use client";

import { useMemo, useState } from "react";
import { useCngData } from "@/context/CngDataContext";
import { getDeadlineMetrics, type CngDeadlineCategory } from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngDeadlineSummary } from "@/components/cng/CngDeadlineSummary";
import { CngDeadlineTable } from "@/components/cng/CngDeadlineTable";
import styles from "./page.module.css";

type FilterValue = "all" | CngDeadlineCategory;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due Today" },
  { value: "due-soon", label: "Due Soon" },
  { value: "upcoming", label: "Upcoming" },
  { value: "no-due-date", label: "No Due Date" },
];

export default function DeadlinesPage() {
  const { tasks, loading, error, status, lastUpdated, refresh } = useCngData();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const { summary, tasks: deadlineTasks } = useMemo(
    () => getDeadlineMetrics(tasks, today),
    [tasks, today]
  );

  const filteredTasks = useMemo(() => {
    let result = deadlineTasks;
    if (filter !== "all") {
      result = result.filter((t) => t.deadlineCategory === filter);
    }
    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.bucket.name.toLowerCase().includes(query) ||
          t.assignees.some((a) => a.name.toLowerCase().includes(query))
      );
    }
    return result;
  }, [deadlineTasks, filter, search]);

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading deadlines…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load deadline data: ${error}`} />
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
          <h1 className={styles.pageTitle}>Deadlines</h1>
          <p className={styles.pageSubtitle}>
            What CNG work is due, and when — ordered by urgency across every live Planner bucket.
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
      ) : deadlineTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <DataUnavailable label="NO ACTIVE DEADLINES" detail="Every CNG task is completed — nothing is currently due." />
        </div>
      ) : (
        <>
          <CngDeadlineSummary summary={summary} />

          <div className={styles.controls}>
            <div className={styles.filterRow} role="group" aria-label="Filter by deadline category">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  className={styles.filterChip}
                  data-active={filter === f.value}
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              className={styles.search}
              type="search"
              placeholder="Search task, bucket, or assignee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search deadlines"
            />
          </div>

          <CngDeadlineTable tasks={filteredTasks} today={today} />
        </>
      )}
    </div>
  );
}