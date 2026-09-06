"use client";

import { useMemo, useState } from "react";
import type { CngPhaseMetrics } from "@/types/cng";
import { PHASE_STATUS_LABELS } from "@/config/buckets";
import { StatusDistribution } from "@/components/cng/CngStatusDistribution";
import styles from "./CngBucketTable.module.css";

interface CngBucketTableProps {
  phaseMetrics: CngPhaseMetrics[];
}

type SortKey = "taskCount" | "completed" | "active" | "overdue" | "completion";
type SortDirection = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  taskCount: "Total Tasks",
  completed: "Completed",
  active: "Active Workload",
  overdue: "Overdue",
  completion: "Completion %",
};

function sortValue(row: CngPhaseMetrics, key: SortKey): number {
  switch (key) {
    case "taskCount":
      return row.totalTasks;
    case "completed":
      return row.completedTasks;
    case "active":
      return row.incompleteTasks;
    case "overdue":
      return row.overdueTasks;
    case "completion":
      // NOT_YET_POPULATED (null) sorts as -1, below every real 0%+.
      return row.completionPercentage ?? -1;
  }
}

export function CngBucketTable({ phaseMetrics }: CngBucketTableProps) {
  const [query, setQuery] = useState("");
  // Default: overdue attention first, active workload as tie-break.
  const [sortKey, setSortKey] = useState<SortKey>("overdue");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phaseMetrics;
    return phaseMetrics.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.shortName?.toLowerCase().includes(q) ||
        row.group?.toLowerCase().includes(q)
    );
  }, [phaseMetrics, query]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      const primary = sortValue(b, sortKey) - sortValue(a, sortKey);
      const diff = sortDirection === "desc" ? primary : -primary;
      if (diff !== 0) return diff;
      // Tie-break: active workload, then original Planner order.
      const tiebreak = b.incompleteTasks - a.incompleteTasks;
      return tiebreak !== 0 ? tiebreak : a.order - b.order;
    });
    return rows;
  }, [filtered, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.search}
          placeholder="Search buckets…"
          aria-label="Search buckets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {sorted.length === 0 ? (
        <div className={styles.noResults}>No buckets match &ldquo;{query}&rdquo;.</div>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Bucket</th>
                <th scope="col">Group</th>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                  <th key={key} scope="col" aria-sort={sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => handleSort(key)}
                    >
                      {SORT_LABELS[key]}
                      {sortKey === key && (
                        <span className={styles.sortArrow} aria-hidden="true">
                          {sortDirection === "desc" ? "▼" : "▲"}
                        </span>
                      )}
                    </button>
                  </th>
                ))}
                <th scope="col">Status</th>
                <th scope="col">Distribution</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={styles.bucketName}>
                    {row.name}
                  </th>
                  <td className={styles.groupCell}>{row.group ?? "—"}</td>
                  <td>{row.totalTasks}</td>
                  <td>{row.completedTasks}</td>
                  <td>{row.incompleteTasks}</td>
                  <td className={row.overdueTasks > 0 ? styles.overdueValue : undefined}>
                    {row.overdueTasks}
                  </td>
                  <td>
                    {row.completionPercentage === null ? (
                      <span className={styles.notPopulated}>NOT YET POPULATED</span>
                    ) : (
                      `${row.completionPercentage}%`
                    )}
                  </td>
                  <td>
                    <span className={styles.statusBadge} data-status={row.status}>
                      {PHASE_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td>
                    <StatusDistribution
                      completed={row.completedTasks}
                      inProgress={row.inProgressTasks}
                      notStarted={row.notStartedTasks}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}