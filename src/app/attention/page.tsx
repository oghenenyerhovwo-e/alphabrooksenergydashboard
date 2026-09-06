"use client";

import { useMemo, useState } from "react";
import { useCngData } from "@/context/CngDataContext";
import {
  calculateAttentionMetrics,
  type CngAttentionPriorityLevel,
  type CngAttentionSignalType,
} from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngAttentionSummary } from "@/components/cng/CngAttentionSummary";
import { CngAttentionTable } from "@/components/cng/CngAttentionTable";
import styles from "./page.module.css";

type FilterValue = "all" | CngAttentionPriorityLevel | CngAttentionSignalType;

const PRIORITY_VALUES = new Set<CngAttentionPriorityLevel>(["critical", "high", "medium", "low"]);

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "overdue", label: "Overdue" },
  { value: "unassigned", label: "Unassigned" },
  { value: "high-priority", label: "High Priority" },
  { value: "no-due-date", label: "No Due Date" },
];

export default function AttentionPage() {
  const { tasks, loading, error, status, lastUpdated, refresh } = useCngData();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [search, setSearch] = useState("");

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const { summary, tasks: attentionTasks } = useMemo(
    () => calculateAttentionMetrics(tasks, today),
    [tasks, today]
  );

  const filteredTasks = useMemo(() => {
    let result = attentionTasks;
    if (filter !== "all") {
      result = PRIORITY_VALUES.has(filter as CngAttentionPriorityLevel)
        ? result.filter((t) => t.priorityLevel === filter)
        : result.filter((t) => t.signals.includes(filter as CngAttentionSignalType));
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
  }, [attentionTasks, filter, search]);

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading attention items…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load attention data: ${error}`} />
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
          <h1 className={styles.pageTitle}>Needs Attention</h1>
          <p className={styles.pageSubtitle}>
            What currently requires management intervention, ranked by objective, deterministic signals.
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
      ) : attentionTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <DataUnavailable label="NOTHING NEEDS ATTENTION" detail="No active task currently triggers an attention signal." />
        </div>
      ) : (
        <>
          <CngAttentionSummary summary={summary} />

          <div className={styles.controls}>
            <div className={styles.filterRow} role="group" aria-label="Filter attention items">
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
              aria-label="Search attention items"
            />
          </div>

          <CngAttentionTable tasks={filteredTasks} today={today} />
        </>
      )}
    </div>
  );
}