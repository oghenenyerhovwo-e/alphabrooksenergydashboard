"use client";

import { useMemo, useState } from "react";
import { useCngData } from "@/context/CngDataContext";
import { calculateTaskMetrics, getDeadlineMetrics } from "@/lib/cng/calculations";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import { CngTaskSummary } from "@/components/cng/CngTaskSummary";
import { CngTaskFilters, type FilterOption, type TaskSortMode } from "@/components/cng/CngTaskFilters";
import { CngTaskTable, type ExplorerTask } from "@/components/cng/CngTaskTable";
import { CngTaskDetail } from "@/components/cng/CngTaskDetail";
import type { TaskDeadlineTone } from "@/components/cng/CngTaskBadges";
import styles from "./page.module.css";

const UNASSIGNED_VALUE = "unassigned";
const NO_PRIORITY_VALUE = "none";
const ALL_VALUE = "all";

function priorityRankFor(priority?: string): number {
  if (!priority) return 3;
  const lower = priority.toLowerCase();
  if (lower.includes("urgent")) return 0;
  if (lower.includes("important")) return 1;
  return 2;
}

const DEADLINE_TONE_ORDER: Record<TaskDeadlineTone, number> = {
  overdue: 0,
  "due-today": 1,
  "due-soon": 2,
  upcoming: 3,
  "no-due-date": 4,
  completed: 5,
};

export default function TasksPage() {
  const { tasks, buckets, loading, error, status, lastUpdated, refresh } = useCngData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [bucketFilter, setBucketFilter] = useState(ALL_VALUE);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_VALUE);
  const [priorityFilter, setPriorityFilter] = useState(ALL_VALUE);
  const [deadlineFilter, setDeadlineFilter] = useState(ALL_VALUE);
  const [sortBy, setSortBy] = useState<TaskSortMode>("relevance");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const deadlineMetrics = useMemo(() => getDeadlineMetrics(tasks, today), [tasks, today]);
  const deadlineById = useMemo(() => {
    const map = new Map<string, (typeof deadlineMetrics.tasks)[number]>();
    for (const t of deadlineMetrics.tasks) map.set(t.id, t);
    return map;
  }, [deadlineMetrics]);

  const taskMetrics = useMemo(() => calculateTaskMetrics(tasks), [tasks]);

  const summaryExtra = useMemo(() => {
    const activeTasks = taskMetrics.totalTasks - taskMetrics.completedTasks;
    const unassignedTasks = tasks.filter((t) => t.assignees.length === 0).length;
    return {
      activeTasks,
      unassignedTasks,
      dueSoonTasks: deadlineMetrics.summary.dueSoon,
    };
  }, [taskMetrics, tasks, deadlineMetrics]);

  const explorerTasks: ExplorerTask[] = useMemo(() => {
    return tasks.map((task) => {
      if (task.status === "completed") {
        return { ...task, deadlineTone: "completed" as TaskDeadlineTone };
      }
      const enriched = deadlineById.get(task.id);
      return {
        ...task,
        deadlineTone: (enriched?.deadlineCategory ?? "no-due-date") as TaskDeadlineTone,
        daysOverdue: enriched?.daysOverdue,
      };
    });
  }, [tasks, deadlineById]);

  const bucketOptions: FilterOption[] = useMemo(() => {
    const opts = buckets.map((b) => ({ value: b.id, label: b.shortName || b.name }));
    return [{ value: ALL_VALUE, label: "All Buckets" }, ...opts];
  }, [buckets]);

  const assigneeOptions: FilterOption[] = useMemo(() => {
    const byId = new Map<string, string>();
    for (const t of tasks) {
      for (const a of t.assignees) {
        if (!byId.has(a.id)) byId.set(a.id, a.name);
      }
    }
    const opts = Array.from(byId.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [{ value: ALL_VALUE, label: "All Assignees" }, ...opts, { value: UNASSIGNED_VALUE, label: "Unassigned" }];
  }, [tasks]);

  const priorityOptions: FilterOption[] = useMemo(() => {
    const values = new Set<string>();
    for (const t of tasks) {
      if (t.priority) values.add(t.priority);
    }
    const opts = Array.from(values)
      .sort((a, b) => a.localeCompare(b))
      .map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) }));
    return [{ value: ALL_VALUE, label: "All Priorities" }, ...opts, { value: NO_PRIORITY_VALUE, label: "No Priority" }];
  }, [tasks]);

  const isFiltering =
    search.trim() !== "" ||
    statusFilter !== ALL_VALUE ||
    bucketFilter !== ALL_VALUE ||
    assigneeFilter !== ALL_VALUE ||
    priorityFilter !== ALL_VALUE ||
    deadlineFilter !== ALL_VALUE;

  const filteredTasks = useMemo(() => {
    let result = explorerTasks;

    const query = search.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.bucket.name.toLowerCase().includes(query) ||
          t.assignees.some((a) => a.name.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== ALL_VALUE) {
      result = result.filter((t) => t.status === statusFilter);
    }

    if (bucketFilter !== ALL_VALUE) {
      result = result.filter((t) => t.bucket.id === bucketFilter);
    }

    if (assigneeFilter !== ALL_VALUE) {
      if (assigneeFilter === UNASSIGNED_VALUE) {
        result = result.filter((t) => t.assignees.length === 0);
      } else {
        result = result.filter((t) => t.assignees.some((a) => a.id === assigneeFilter));
      }
    }

    if (priorityFilter !== ALL_VALUE) {
      if (priorityFilter === NO_PRIORITY_VALUE) {
        result = result.filter((t) => !t.priority);
      } else {
        result = result.filter((t) => t.priority === priorityFilter);
      }
    }

    if (deadlineFilter !== ALL_VALUE) {
      result = result.filter((t) => t.deadlineTone === deadlineFilter);
    }

    return sortExplorerTasks(result, sortBy);
  }, [explorerTasks, search, statusFilter, bucketFilter, assigneeFilter, priorityFilter, deadlineFilter, sortBy]);

  const selectedTask = selectedTaskId ? explorerTasks.find((t) => t.id === selectedTaskId) ?? null : null;

  function clearFilters() {
    setSearch("");
    setStatusFilter(ALL_VALUE);
    setBucketFilter(ALL_VALUE);
    setAssigneeFilter(ALL_VALUE);
    setPriorityFilter(ALL_VALUE);
    setDeadlineFilter(ALL_VALUE);
  }

  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <div className={styles.loadingRing} />
        <p className={styles.stateText}>Loading tasks…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.stateWrap}>
        <DataUnavailable detail={`Couldn't load task data: ${error}`} />
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
          <h1 className={styles.pageTitle}>CNG Tasks</h1>
          <p className={styles.pageSubtitle}>
            Detailed view of live CNG project tasks. Track ownership, status, priority, and deadlines.
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
          <CngTaskSummary taskMetrics={taskMetrics} extra={summaryExtra} />

          <CngTaskFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            bucket={bucketFilter}
            onBucketChange={setBucketFilter}
            bucketOptions={bucketOptions}
            assignee={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
            assigneeOptions={assigneeOptions}
            priority={priorityFilter}
            onPriorityChange={setPriorityFilter}
            priorityOptions={priorityOptions}
            deadline={deadlineFilter}
            onDeadlineChange={setDeadlineFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            isFiltering={isFiltering}
            onClear={clearFilters}
          />

          <p className={styles.resultCount}>
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>

          <CngTaskTable tasks={filteredTasks} today={today} onSelectTask={setSelectedTaskId} />
        </>
      )}

      {selectedTask && <CngTaskDetail task={selectedTask} today={today} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}

function sortExplorerTasks(tasks: ExplorerTask[], mode: TaskSortMode): ExplorerTask[] {
  const withIndex = tasks.map((task, index) => ({ task, index }));

  withIndex.sort((a, b) => {
    const t1 = a.task;
    const t2 = b.task;

    switch (mode) {
      case "due-date": {
        const d1 = t1.dueDate ? Date.parse(t1.dueDate) : Infinity;
        const d2 = t2.dueDate ? Date.parse(t2.dueDate) : Infinity;
        if (d1 !== d2) return d1 - d2;
        break;
      }
      case "priority": {
        const r1 = priorityRankFor(t1.priority);
        const r2 = priorityRankFor(t2.priority);
        if (r1 !== r2) return r1 - r2;
        break;
      }
      case "status": {
        const order: Record<string, number> = { "not-started": 0, "in-progress": 1, completed: 2 };
        if (order[t1.status] !== order[t2.status]) return order[t1.status] - order[t2.status];
        break;
      }
      case "name":
        return t1.title.localeCompare(t2.title);
      case "relevance":
      default: {
        const r1 = DEADLINE_TONE_ORDER[t1.deadlineTone];
        const r2 = DEADLINE_TONE_ORDER[t2.deadlineTone];
        if (r1 !== r2) return r1 - r2;
        const d1 = t1.dueDate ? Date.parse(t1.dueDate) : Infinity;
        const d2 = t2.dueDate ? Date.parse(t2.dueDate) : Infinity;
        if (d1 !== d2) return d1 - d2;
        break;
      }
    }

    const titleCompare = t1.title.localeCompare(t2.title);
    if (titleCompare !== 0) return titleCompare;
    return a.index - b.index;
  });

  return withIndex.map((w) => w.task);
}