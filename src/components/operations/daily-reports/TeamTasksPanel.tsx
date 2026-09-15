"use client";

/**
 * MAIN OPERATIONS — TEAM TRACKER
 *
 * Hierarchy:
 *
 *   Role Group
 *     → Planner Bucket
 *       → Team Member
 *         → Tasks
 *           → Task Details
 *
 * This component remains READ-ONLY.
 * All data continues to come from the selected historical snapshot.
 *
 * PHASE 2 (redesign): visual pass only. Buckets, people, tasks, and task
 * details were already collapsed by default before this phase — that
 * state architecture is untouched. What changed is presentation: the
 * previous version nested a bordered/shadowed "card" at every level
 * (Role card > Person card > Task card), which is exactly the
 * card-in-card look this redesign moves away from. Hierarchy now comes
 * from typography, indentation, and dividers instead of boxes — only
 * the collapsed task detail panel remains a single restrained surface.
 *
 * The project has no icon library installed (see ReportCalendar.tsx),
 * so status/role/chevron icons below are small hand-written inline SVGs
 * in the same pattern, scoped to this file.
 */

import { useMemo, useState } from "react";

import type { OperationsTask } from "@/types/operations";
import type { OperationsDailyReportSnapshot } from "@/types/operations-history";

import styles from "./daily-reports.module.css";

const UNASSIGNED_ID = "__unassigned__";
const UNASSIGNED_NAME = "Unassigned";

/* ============================================================
   ICONS
   Small hand-written inline SVGs — see ReportCalendar.tsx for the
   same rationale. Not shared across files to avoid a premature
   abstraction over two components.
   ============================================================ */

type IconProps = { size?: number } & React.SVGProps<SVGSVGElement>;

function IconBase({
  size = 15,
  children,
  ...rest
}: { size?: number; children: React.ReactNode } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Right-pointing by default; rotated 90° via CSS (`.chevron[data-open="true"]`) to read as "down" when expanded. */
function ChevronIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="9 6 15 12 9 18" />
    </IconBase>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

function CheckCircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </IconBase>
  );
}

function ClockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </IconBase>
  );
}

function CircleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
    </IconBase>
  );
}

function AlertTriangleIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </IconBase>
  );
}

/** Status is still communicated by the text label next to it (statusLabel) — the icon is a reinforcement, not the only signal. */
function StatusIcon({ status }: { status: OperationsTask["status"] }) {
  if (status === "completed") return <CheckCircleIcon size={16} />;
  if (status === "in-progress") return <ClockIcon size={16} />;
  return <CircleIcon size={16} />;
}

/* ============================================================
   FORMATTING HELPERS
   ============================================================ */

function formatTaskDate(value: string | undefined): string | null {
  if (!value) return null;

  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(parsed));
}

function priorityLabel(priority: number | undefined): string | null {
  if (priority === undefined || priority === null) {
    return null;
  }

  if (priority <= 1) {
    return "Urgent";
  }

  if (priority <= 4) {
    return "Important";
  }

  if (priority <= 6) {
    return "Medium";
  }

  return "Low";
}

function statusLabel(task: OperationsTask): string {
  if (task.status === "completed") {
    return "Completed";
  }

  if (task.status === "in-progress") {
    return "In Progress";
  }

  return "Pending";
}

/* ============================================================
   PLANNER NOTE
   ============================================================ */

const NOTE_HEADER = /^(update|blocker|next)\s*:/i;

function NoteBody({ notes }: { notes: string }) {
  const lines = notes.split("\n");

  return (
    <div className={styles.noteBody}>
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (trimmed === "") {
          return (
            <div
              key={index}
              className={styles.noteGap}
              aria-hidden="true"
            />
          );
        }

        const header = NOTE_HEADER.exec(trimmed);

        if (header) {
          const kind = header[1].toLowerCase();

          return (
            <p
              key={index}
              className={styles.noteHeading}
              data-kind={kind}
            >
              {trimmed}
            </p>
          );
        }

        return (
          <p
            key={index}
            className={styles.noteLine}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

/* ============================================================
   FIELD
   ============================================================ */

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>

      <span
        className={styles.fieldValue}
        data-empty={value === null}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}

/* ============================================================
   TASK
   ============================================================ */

function TaskRow({
  task,
  assigneeKey,
  bucketLabel,
  roleLabel,
}: {
  task: OperationsTask;
  assigneeKey: string;
  bucketLabel: string;
  roleLabel: string;
}) {
  /*
   * Tasks are intentionally CLOSED by default.
   * Details only appear when the user clicks the task.
   */
  const [open, setOpen] = useState(false);

  const detailId = `task-detail-${assigneeKey.replace(
    /\s+/g,
    "-"
  )}-${task.id}`;

  const assignees =
    task.assignees.length > 0
      ? task.assignees.map((assignee) => assignee.name).join(", ")
      : null;

  return (
    <li className={styles.taskItem}>
      <button
        type="button"
        className={styles.taskRow}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={detailId}
        data-status={task.status}
      >
        <span
          className={styles.taskGlyph}
          data-status={task.status}
          aria-hidden="true"
        >
          <StatusIcon status={task.status} />
        </span>

        <span className={styles.taskContent}>
          <span className={styles.taskTitle}>
            {task.title}
          </span>

          <span className={styles.taskMeta}>
            <span
              className={styles.taskStatus}
              data-status={task.status}
            >
              {statusLabel(task)}
            </span>

            {task.isOverdue && (
              <span className={styles.overdueBadge}>
                <AlertTriangleIcon size={10} />
                Overdue
              </span>
            )}

            {task.blockers.length > 0 && (
              <span className={styles.blockerBadge}>
                <AlertTriangleIcon size={10} />
                Blocker
              </span>
            )}
          </span>
        </span>

        <span
          className={styles.chevron}
          data-open={open}
          aria-hidden="true"
        >
          <ChevronIcon size={14} />
        </span>
      </button>

      {open && (
        <div
          className={styles.taskDetail}
          id={detailId}
        >
          <div className={styles.detailHeading}>
            <span className={styles.detailEyebrow}>
              Task Details
            </span>
            <p className={styles.detailTitle}>
              {task.title}
            </p>
          </div>

          <div className={styles.fieldGrid}>
            <Field
              label="Status"
              value={statusLabel(task)}
            />

            <Field
              label="Due date"
              value={formatTaskDate(task.dueDate)}
            />

            <Field
              label="Assigned to"
              value={assignees}
            />

            <Field
              label="Planner bucket"
              value={bucketLabel}
            />

            <Field
              label="Priority"
              value={priorityLabel(task.priority)}
            />

            <Field
              label="Percent complete"
              value={`${task.percentComplete}%`}
            />

            <Field
              label="Role group"
              value={roleLabel}
            />

            <Field
              label="Overdue"
              value={task.isOverdue ? "Yes" : "No"}
            />

            <Field
              label="Start date"
              value={formatTaskDate(task.startDate)}
            />

            <Field
              label="Completed"
              value={formatTaskDate(task.completedDate)}
            />
          </div>

          <div className={styles.noteSection}>
            <span className={styles.fieldLabel}>
              Planner Note
            </span>

            {task.notes && task.notes.trim().length > 0 ? (
              <NoteBody notes={task.notes} />
            ) : (
              <p className={styles.emptyNote}>
                No Planner note recorded.
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/* ============================================================
   GROUPING
   Role Group → Planner Bucket → Assigned User → Tasks
   ============================================================ */

interface AssigneeGroup {
  id: string;
  name: string;
  role?: string;
  tasks: OperationsTask[];
}

interface BucketGroup {
  id: string;
  name: string;
  shortName?: string;
  assignees: AssigneeGroup[];
  taskCount: number;
  /** assignees.length, surfaced as its own field purely for display — same data, no new calculation. */
  peopleCount: number;
}

interface RoleGroup {
  label: string;
  buckets: BucketGroup[];
  taskCount: number;
  /** Unique people across all of this role's buckets — a person working in two buckets under the same role is counted once. */
  peopleCount: number;
}

function buildRoleGroups(
  snapshot: OperationsDailyReportSnapshot
): RoleGroup[] {
  const uniqueTasksById = new Map<string, OperationsTask>();

  for (const employee of snapshot.employees) {
    for (const task of employee.tasks) {
      uniqueTasksById.set(task.id, task);
    }
  }

  for (const task of snapshot.unassignedTasks) {
    uniqueTasksById.set(task.id, task);
  }

  interface BucketAccumulator {
    id: string;
    name: string;
    shortName?: string;
    group?: string;
    assigneesById: Map<string, AssigneeGroup>;
  }

  const bucketsById = new Map<string, BucketAccumulator>();

  for (const task of uniqueTasksById.values()) {
    const bucket = task.bucket ?? {
      id: "__unbucketed__",
      name: "Unbucketed",
      shortName: undefined,
      group: undefined,
    };

    let bucketEntry = bucketsById.get(bucket.id);

    if (!bucketEntry) {
      bucketEntry = {
        id: bucket.id,
        name: bucket.name,
        shortName: bucket.shortName,
        group: bucket.group,
        assigneesById: new Map(),
      };

      bucketsById.set(bucket.id, bucketEntry);
    }

    const taskAssignees =
      task.assignees && task.assignees.length > 0
        ? task.assignees
        : [
            {
              id: UNASSIGNED_ID,
              name: UNASSIGNED_NAME,
              role: undefined,
            },
          ];

    for (const assignee of taskAssignees) {
      let assigneeGroup =
        bucketEntry.assigneesById.get(assignee.id);

      if (!assigneeGroup) {
        assigneeGroup = {
          id: assignee.id,
          name: assignee.name,
          role: assignee.role,
          tasks: [],
        };

        bucketEntry.assigneesById.set(
          assignee.id,
          assigneeGroup
        );
      }

      assigneeGroup.tasks.push(task);
    }
  }

  const roleGroupsByLabel = new Map<string, RoleGroup>();

  for (const bucketEntry of bucketsById.values()) {
    const label =
      bucketEntry.group ?? bucketEntry.name;

    const assignees = Array.from(
      bucketEntry.assigneesById.values()
    ).sort((a, b) => {
      if (a.id === UNASSIGNED_ID) {
        return 1;
      }

      if (b.id === UNASSIGNED_ID) {
        return -1;
      }

      return a.name.localeCompare(b.name);
    });

    const bucketGroup: BucketGroup = {
      id: bucketEntry.id,
      name: bucketEntry.name,
      shortName: bucketEntry.shortName,
      assignees,
      taskCount: assignees.reduce(
        (sum, assignee) =>
          sum + assignee.tasks.length,
        0
      ),
      peopleCount: assignees.length,
    };

    let roleGroup =
      roleGroupsByLabel.get(label);

    if (!roleGroup) {
      roleGroup = {
        label,
        buckets: [],
        taskCount: 0,
        peopleCount: 0,
      };

      roleGroupsByLabel.set(
        label,
        roleGroup
      );
    }

    roleGroup.buckets.push(bucketGroup);
  }

  const roleGroups = Array.from(
    roleGroupsByLabel.values()
  ).map((roleGroup) => {
    const buckets = [
      ...roleGroup.buckets,
    ].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const uniquePeopleIds = new Set<string>();
    for (const bucket of buckets) {
      for (const assignee of bucket.assignees) {
        uniquePeopleIds.add(assignee.id);
      }
    }

    return {
      ...roleGroup,
      buckets,
      taskCount: buckets.reduce(
        (sum, bucket) =>
          sum + bucket.taskCount,
        0
      ),
      peopleCount: uniquePeopleIds.size,
    };
  });

  roleGroups.sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return roleGroups;
}

/* ============================================================
   ASSIGNEE
   ============================================================ */

function AssigneeSection({
  assignee,
  bucketLabel,
  roleLabel,
}: {
  assignee: AssigneeGroup;
  bucketLabel: string;
  roleLabel: string;
}) {
  /*
   * The person's task list is CLOSED by default.
   */
  const [open, setOpen] = useState(false);

  const bodyId = `assignee-${assignee.id}-${bucketLabel.replace(
    /\s+/g,
    "-"
  )}`;

  const completed = assignee.tasks.filter(
    (task) => task.status === "completed"
  ).length;

  const overdue = assignee.tasks.filter(
    (task) => task.isOverdue
  ).length;

  // Scoped to this bucket's slice of the person's tasks — the snapshot's
  // own employee.completionPercentage covers all of a person's tasks
  // across every bucket, which is a different (and here, wrong) number.
  // Same rounding rule the rest of the app already uses.
  const percent =
    assignee.tasks.length === 0
      ? null
      : Math.round((completed / assignee.tasks.length) * 100);

  return (
    <article className={styles.employee}>
      <button
        type="button"
        className={styles.employeeHead}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className={styles.employeeIdentity}>
          <span
            className={styles.employeeAvatar}
            aria-hidden="true"
          >
            {assignee.name.charAt(0).toUpperCase()}
          </span>

          <span className={styles.employeeText}>
            <span className={styles.employeeName}>
              {assignee.name}
            </span>

            {assignee.role && (
              <span className={styles.employeeRole}>
                {assignee.role}
              </span>
            )}
          </span>
        </span>

        <span className={styles.employeeSummary}>
          <span className={styles.employeeStats}>
            {percent !== null && (
              <span className={styles.employeePercent}>
                {percent}%
              </span>
            )}

            <span className={styles.employeeCounts}>
              {assignee.tasks.length}{" "}
              {assignee.tasks.length === 1 ? "task" : "tasks"}
            </span>

            {overdue > 0 && (
              <span className={styles.overdueBadge}>
                <AlertTriangleIcon size={10} />
                {overdue} overdue
              </span>
            )}
          </span>

          <span
            className={styles.chevron}
            data-open={open}
            aria-hidden="true"
          >
            <ChevronIcon size={14} />
          </span>
        </span>
      </button>

      {open && (
        <div
          id={bodyId}
          className={styles.employeeBody}
        >
          <div className={styles.employeeTasksLabel}>
            <span>
              Tasks
            </span>

            <span>
              {assignee.tasks.length}
            </span>
          </div>

          <ul className={styles.taskList}>
            {assignee.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                assigneeKey={assignee.id}
                bucketLabel={bucketLabel}
                roleLabel={roleLabel}
              />
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/* ============================================================
   BUCKET
   ============================================================ */

function BucketSection({
  bucket,
  roleLabel,
  showHeading,
}: {
  bucket: BucketGroup;
  roleLabel: string;
  showHeading: boolean;
}) {
  /*
   * Buckets are also collapsed by default.
   * This keeps the Team Tracker clean when there are many buckets.
   */
  const [open, setOpen] = useState(false);

  const bodyId = `bucket-${bucket.id}`;

  if (!showHeading) {
    return (
      <div className={styles.bucket}>
        <div className={styles.bucketBody}>
          {bucket.assignees.map((assignee) => (
            <AssigneeSection
              key={assignee.id}
              assignee={assignee}
              bucketLabel={bucket.name}
              roleLabel={roleLabel}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.bucket}>
      <button
        type="button"
        className={styles.bucketHead}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className={styles.bucketHeading}>
          <span className={styles.bucketEyebrow}>
            Planner Bucket
          </span>

          <span className={styles.bucketName}>
            {bucket.shortName ?? bucket.name}
          </span>
        </span>

        <span className={styles.bucketMeta}>
          <span className={styles.bucketCount}>
            {bucket.peopleCount}{" "}
            {bucket.peopleCount === 1 ? "person" : "people"}
            {" · "}
            {bucket.taskCount}{" "}
            {bucket.taskCount === 1 ? "task" : "tasks"}
          </span>

          <span
            className={styles.chevron}
            data-open={open}
            aria-hidden="true"
          >
            <ChevronIcon size={14} />
          </span>
        </span>
      </button>

      {open && (
        <div
          id={bodyId}
          className={styles.bucketBody}
        >
          {bucket.assignees.map((assignee) => (
            <AssigneeSection
              key={assignee.id}
              assignee={assignee}
              bucketLabel={bucket.name}
              roleLabel={roleLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ROLE GROUP
   ============================================================ */

function RoleGroupSection({
  group,
}: {
  group: RoleGroup;
}) {
  /*
   * Role groups are OPEN by default so the user can immediately
   * see the available buckets/people.
   *
   * The deeper content remains collapsed.
   */
  const [open, setOpen] = useState(true);

  const bodyId = `role-${group.label
    .replace(/\s+/g, "-")
    .toLowerCase()}`;

  const showBucketSubheads =
    group.buckets.length > 1;

  return (
    <section className={styles.department}>
      <button
        type="button"
        className={styles.departmentHead}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <span className={styles.departmentHeading}>
          <span className={styles.departmentIcon} aria-hidden="true">
            <UsersIcon size={18} />
          </span>

          <span className={styles.departmentTextGroup}>
            <span className={styles.departmentEyebrow}>
              Team Group
            </span>

            <h3 className={styles.departmentName}>
              {group.label}
            </h3>
          </span>
        </span>

        <span className={styles.departmentMeta}>
          <span>
            {group.peopleCount}{" "}
            {group.peopleCount === 1 ? "person" : "people"}
            {" · "}
            {group.taskCount}{" "}
            {group.taskCount === 1 ? "task" : "tasks"}
          </span>

          <span
            className={styles.chevron}
            data-open={open}
            aria-hidden="true"
          >
            <ChevronIcon size={14} />
          </span>
        </span>
      </button>

      {open && (
        <div
          id={bodyId}
          className={styles.departmentBody}
        >
          {group.buckets.map((bucket) => (
            <BucketSection
              key={bucket.id}
              bucket={bucket}
              roleLabel={group.label}
              showHeading={showBucketSubheads}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   PANEL
   ============================================================ */

export function TeamTasksPanel({
  snapshot,
}: {
  snapshot: OperationsDailyReportSnapshot;
}) {
  const roleGroups = useMemo(
    () => buildRoleGroups(snapshot),
    [snapshot]
  );

  const hasAnyTasks =
    snapshot.employees.some(
      (employee) => employee.totalTasks > 0
    ) || snapshot.unassignedTasks.length > 0;

  if (
    roleGroups.length === 0 ||
    !hasAnyTasks
  ) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyTitle}>
          No team data in this report
        </div>

        <p>
          This report was recorded, but it contains
          no employees or tasks for that date.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.departments}>
      {roleGroups.map((group) => (
        <RoleGroupSection
          key={group.label}
          group={group}
        />
      ))}
    </div>
  );
}