"use client";

import { useMemo, useState } from "react";
import type { TeamMemberPerformance } from "@/types/cng";
import { PerformanceProgress } from "./CngPerformanceProgress";
import { StatusDistribution } from "./CngStatusDistribution";
import styles from "./CngTeamPerformanceTable.module.css";

interface TeamPerformanceTableProps {
  members: TeamMemberPerformance[];
  unassigned: TeamMemberPerformance;
}

type SortKey = "attention" | "totalTasks" | "completedTasks" | "activeTasks" | "overdueTasks" | "completionRate";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: SortKey;
  label: string;
}

const SORTABLE_COLUMNS: ColumnDef[] = [
  { key: "totalTasks", label: "Total Tasks" },
  { key: "completedTasks", label: "Completed" },
  { key: "activeTasks", label: "Active Workload" },
  { key: "overdueTasks", label: "Overdue" },
  { key: "completionRate", label: "Completion Rate" },
];

function compareMembers(a: TeamMemberPerformance, b: TeamMemberPerformance, key: SortKey, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;

  if (key === "attention") {
    // Default operational ordering: overdue attention first, then active workload.
    if (a.overdueTasks !== b.overdueTasks) return b.overdueTasks - a.overdueTasks;
    return b.activeTasks - a.activeTasks;
  }

  if (key === "completionRate") {
    const av = a.completionRate;
    const bv = b.completionRate;
    if (av === null && bv === null) return 0;
    if (av === null) return 1; // members with no tasks always sort to the end
    if (bv === null) return -1;
    return (av - bv) * mul;
  }

  return (a[key] - b[key]) * mul;
}

export function TeamPerformanceTable({ members, unassigned }: TeamPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("attention");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => compareMembers(a, b, sortKey, sortDir)),
    [members, sortKey, sortDir]
  );

  const maxActive = useMemo(
    () => Math.max(1, ...members.map((m) => m.activeTasks), unassigned.activeTasks),
    [members, unassigned]
  );

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function ariaSortFor(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function renderRow(member: TeamMemberPerformance, variant: "member" | "unassigned") {
    return (
      <tr key={member.userId} className={variant === "unassigned" ? styles.unassignedRow : undefined}>
        <td className={styles.nameCell}>
          <div className={styles.nameBlock}>
            <span className={styles.name}>{member.name}</span>
            {member.role && <span className={styles.role}>{member.role}</span>}
          </div>
          <StatusDistribution
            completed={member.completedTasks}
            inProgress={member.inProgressTasks}
            notStarted={member.notStartedTasks}
          />
        </td>
        <td className={styles.numCell}>{member.totalTasks}</td>
        <td className={styles.numCell}>{member.completedTasks}</td>
        <td className={styles.numCell}>{member.inProgressTasks}</td>
        <td className={styles.numCell}>{member.notStartedTasks}</td>
        <td className={styles.numCell}>
          {member.overdueTasks > 0 ? (
            <span className={styles.overdueBadge}>{member.overdueTasks}</span>
          ) : (
            <span className={styles.numMuted}>0</span>
          )}
        </td>
        <td className={styles.numCell}>
          <div className={styles.workloadCell}>
            <span>{member.activeTasks}</span>
            <div className={styles.workloadTrack} aria-hidden="true">
              <div
                className={styles.workloadFill}
                style={{ width: `${(member.activeTasks / maxActive) * 100}%` }}
              />
            </div>
          </div>
        </td>
        <td className={styles.progressCell}>
          <PerformanceProgress
            value={member.completionRate}
            ariaLabel={`${member.name} completion rate`}
          />
        </td>
      </tr>
    );
  }

  return (
    <section className={styles.wrap} aria-label="Team member performance">
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <caption className={styles.caption}>
            Task distribution and progress by team member
          </caption>
          <thead>
            <tr>
              <th scope="col">Team Member</th>
              {SORTABLE_COLUMNS.map((col) => (
                <th key={col.key} scope="col" aria-sort={ariaSortFor(col.key)}>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.label}${
                      sortKey === col.key ? `, currently ${sortDir === "asc" ? "ascending" : "descending"}` : ""
                    }`}
                  >
                    {col.label}
                    <span className={styles.sortIndicator} aria-hidden="true">
                      {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => renderRow(member, "member"))}
            {renderRow(unassigned, "unassigned")}
          </tbody>
        </table>
      </div>
    </section>
  );
}