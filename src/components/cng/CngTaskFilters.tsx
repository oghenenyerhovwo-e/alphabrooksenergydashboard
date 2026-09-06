"use client";

import styles from "./CngTaskFilters.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

export type TaskSortMode = "relevance" | "due-date" | "priority" | "status" | "name";

const SORT_OPTIONS: FilterOption[] = [
  { value: "relevance", label: "Relevance (default)" },
  { value: "due-date", label: "Due Date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "name", label: "Task Name" },
];

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "not-started", label: "Not Started" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const DEADLINE_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Deadlines" },
  { value: "overdue", label: "Overdue" },
  { value: "due-today", label: "Due Today" },
  { value: "due-soon", label: "Due Soon" },
  { value: "upcoming", label: "Upcoming" },
  { value: "no-due-date", label: "No Due Date" },
];

interface TaskFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;

  status: string;
  onStatusChange: (value: string) => void;

  bucket: string;
  onBucketChange: (value: string) => void;
  bucketOptions: FilterOption[];

  assignee: string;
  onAssigneeChange: (value: string) => void;
  assigneeOptions: FilterOption[];

  priority: string;
  onPriorityChange: (value: string) => void;
  priorityOptions: FilterOption[];

  deadline: string;
  onDeadlineChange: (value: string) => void;

  sortBy: TaskSortMode;
  onSortChange: (value: TaskSortMode) => void;

  isFiltering: boolean;
  onClear: () => void;
}

export function CngTaskFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  bucket,
  onBucketChange,
  bucketOptions,
  assignee,
  onAssigneeChange,
  assigneeOptions,
  priority,
  onPriorityChange,
  priorityOptions,
  deadline,
  onDeadlineChange,
  sortBy,
  onSortChange,
  isFiltering,
  onClear,
}: TaskFiltersProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.searchRow}>
        <label className={styles.visuallyHidden} htmlFor="task-search">
          Search tasks
        </label>
        <input
          id="task-search"
          className={styles.search}
          type="search"
          placeholder="Search tasks, buckets, or assignees…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <div className={styles.sortGroup}>
          <label className={styles.sortLabel} htmlFor="task-sort">
            Sort by
          </label>
          <select
            id="task-sort"
            className={styles.select}
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as TaskSortMode)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.filterRow}>
        <FilterSelect id="task-filter-status" label="Status" value={status} onChange={onStatusChange} options={STATUS_OPTIONS} />
        <FilterSelect id="task-filter-bucket" label="Bucket" value={bucket} onChange={onBucketChange} options={bucketOptions} />
        <FilterSelect id="task-filter-assignee" label="Assignee" value={assignee} onChange={onAssigneeChange} options={assigneeOptions} />
        <FilterSelect id="task-filter-priority" label="Priority" value={priority} onChange={onPriorityChange} options={priorityOptions} />
        <FilterSelect id="task-filter-deadline" label="Deadline" value={deadline} onChange={onDeadlineChange} options={DEADLINE_OPTIONS} />

        {isFiltering && (
          <button type="button" className={styles.clearButton} onClick={onClear}>
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}) {
  return (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}