"use client";

/**
 * MAIN OPERATIONS — PERFORMANCE TAB (Phase 8, redesigned Phase 3)
 *
 * Renders the selected day's stored Phase 6 snapshot as an executive
 * operational view: performance overview, overall completion, team
 * performance, task status distribution, and an attention summary.
 *
 * Everything here is READ from the snapshot. Nothing is calculated from
 * live Planner state, nothing is recalculated against today's date, and
 * no AI provider is involved — the percentages and counts below are the
 * integers application code computed on the reporting date and wrote to
 * the database. This panel works fine with ARIA completely unavailable.
 *
 * The only arithmetic performed here is turning stored counts into CSS
 * bar widths and zero-padded numerals for display, which cannot change
 * a reported figure.
 *
 * Receives the SAME snapshot object as TeamTasksPanel — switching tabs
 * costs zero requests.
 *
 * PHASE 3: visual redesign only. The four sections (overview, team,
 * status, attention) and every value they read are unchanged. What
 * changed is presentation — this moved from a 2x2 grid of bordered
 * cards to a single spacious column with a metric strip and dividers,
 * matching the Team Tracker's "no card-in-card" visual language. Task
 * Status and Needs Attention sit side-by-side only at 1200px+; below
 * that they stack, per the rest of the page's responsive behavior.
 *
 * The project has no icon library installed (see TeamTasksPanel.tsx),
 * so status icons below are small hand-written inline SVGs in the same
 * pattern, scoped to this file.
 */

import { useMemo, type ReactNode } from "react";
import type { OperationsTask } from "@/types/operations";
import type {
  OperationsDailyReportSnapshot,
  OperationsSnapshotEmployee,
} from "@/types/operations-history";
import styles from "./daily-reports.module.css";

/** Keeps the attention lists a summary rather than a second Team Tasks tab. */
const MAX_ATTENTION_ITEMS = 6;

type StatusTone = "completed" | "in-progress" | "pending" | "overdue";

/* ============================================================
   ICONS
   Small hand-written inline SVGs — see TeamTasksPanel.tsx for the
   same rationale. Not shared across files to avoid a premature
   abstraction over two components.
   ============================================================ */

 /* ============================================================
   ICONS
   Small hand-written inline SVGs — see TeamTasksPanel.tsx for the
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

/** Status is still communicated by the text label next to it — the icon reinforces, it never carries meaning alone. */
function StatusToneIcon({ tone, size }: { tone: StatusTone; size?: number }) {
  if (tone === "completed") return <CheckCircleIcon size={size} />;
  if (tone === "in-progress") return <ClockIcon size={size} />;
  if (tone === "overdue") return <AlertTriangleIcon size={size} />;
  return <CircleIcon size={size} />;
}

/* ============================================================
   BAR — display-only geometry, never a reported figure
   ============================================================ */

function Bar({
  percent,
  tone,
  label,
}: {
  percent: number;
  tone: StatusTone;
  label: string;
}) {
  const width = Math.max(0, Math.min(100, percent));

  return (
    <div className={styles.barTrack} role="img" aria-label={label}>
      <div className={styles.barFill} data-tone={tone} style={{ width: `${width}%` }} />
    </div>
  );
}

/* ============================================================
   SECTION 0 — PERFORMANCE OVERVIEW (intro + overall completion +
   metric strip)
   ============================================================ */

function MetricItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "completed" | "warn";
}) {
  return (
    <div className={styles.perfMetricItem}>
      <div className={styles.perfMetricLabel}>{label}</div>
      <div className={styles.perfMetricValue} data-tone={tone}>
        {value}
      </div>
    </div>
  );
}

function PerformanceOverview({ snapshot }: { snapshot: OperationsDailyReportSnapshot }) {
  const { completionPercentage, completedUniqueTasks, totalUniqueTasks, statusCounts } =
    snapshot.overall;

  return (
    <section className={styles.perfIntro}>
      <h2 className={styles.perfEyebrow}>Performance overview</h2>
      <p className={styles.perfIntroSubtitle}>
        Daily operational performance for {snapshot.reportDateLabel}
      </p>

      <div className={styles.perfOverall}>
        <h3 id="perf-overall" className={styles.perfSectionTitle}>
          Overall completion
        </h3>

        {completionPercentage === null ? (
          <p className={styles.perfEmptyLine}>Performance data unavailable.</p>
        ) : (
          <>
            <div className={styles.overallFigure}>{completionPercentage}%</div>

            <Bar
              percent={completionPercentage}
              tone="completed"
              label={`Overall team completion ${completionPercentage} percent, ${completedUniqueTasks} of ${totalUniqueTasks} tasks completed.`}
            />

            <p className={styles.overallCaption}>
              {completedUniqueTasks} of {totalUniqueTasks} tasks completed
            </p>
          </>
        )}
      </div>

      <div className={styles.perfMetricStrip}>
        <MetricItem
          label="Overall completion"
          value={completionPercentage === null ? "—" : `${completionPercentage}%`}
          tone="completed"
        />
        <MetricItem label="Completed" value={statusCounts.completed} />
        <MetricItem label="In progress" value={statusCounts.inProgress} />
        <MetricItem label="Pending" value={statusCounts.pending} />
      </div>

      <p className={styles.perfFootnote}>
        Counted over unique Planner tasks — a task assigned to more than one
        person counts once.
      </p>
    </section>
  );
}

/* ============================================================
   SECTION 1 — TEAM PERFORMANCE
   ============================================================ */

function EmployeeRow({ employee }: { employee: OperationsSnapshotEmployee }) {
  // No tasks is not zero performance. No bar, no percentage, no implied failure.
  if (employee.totalTasks === 0 || employee.completionPercentage === null) {
    return (
      <li className={styles.perfEmployee}>
        <div className={styles.perfEmployeeHead}>
          <span className={styles.perfEmployeeName}>{employee.name}</span>
          <span className={styles.perfNoTasks}>No tasks assigned yet</span>
        </div>
      </li>
    );
  }

  return (
    <li className={styles.perfEmployee}>
      <div className={styles.perfEmployeeHead}>
        <span className={styles.perfEmployeeName}>{employee.name}</span>
        <span className={styles.perfEmployeePercent}>
          {employee.completionPercentage}%
        </span>
      </div>

      <Bar
        percent={employee.completionPercentage}
        tone="completed"
        label={`${employee.name} — ${employee.completionPercentage} percent, ${employee.completedTasks} of ${employee.totalTasks} tasks completed.`}
      />

      <div className={styles.perfEmployeeMeta}>
        <span>
          {employee.completedTasks} of {employee.totalTasks} completed
        </span>
        {employee.overdueTasks.length > 0 && (
          <span className={styles.overdueBadge}>
            {employee.overdueTasks.length} overdue
          </span>
        )}
      </div>
    </li>
  );
}

function EmployeesSection({ snapshot }: { snapshot: OperationsDailyReportSnapshot }) {
  const hasNoTaskEmployees = snapshot.employees.some((e) => e.totalTasks === 0);

  return (
    <section className={styles.perfSection} aria-labelledby="perf-team">
      <div className={styles.perfSectionHead}>
        <h3 id="perf-team" className={styles.perfSectionTitle}>
          Team performance
        </h3>
      </div>

      {snapshot.employees.length === 0 ? (
        <p className={styles.perfEmptyLine}>
          No employees were recorded for this report date.
        </p>
      ) : (
        <>
          {/* Stored order — already sorted by name when the snapshot was
              written. No re-sorting, no ranking, no scoring. */}
          <ul className={styles.perfEmployeeList}>
            {snapshot.employees.map((employee) => (
              <EmployeeRow key={employee.userId} employee={employee} />
            ))}
          </ul>

          {hasNoTaskEmployees && (
            <p className={styles.perfFootnote}>
              Employees with no assigned tasks are excluded from the overall team
              figure.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ============================================================
   SECTION 2 — TASK STATUS DISTRIBUTION
   ============================================================ */

function StatusRow({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: StatusTone;
}) {
  const percent = total === 0 ? 0 : (count / total) * 100;

  return (
    <li className={styles.statusRow}>
      <span className={styles.statusIcon} data-tone={tone} aria-hidden="true">
        <StatusToneIcon tone={tone} size={15} />
      </span>
      <span className={styles.statusLabel}>{label}</span>
      <Bar
        percent={percent}
        tone={tone}
        label={`${label}: ${count} of ${total} tasks.`}
      />
      <span className={styles.statusCount}>{count}</span>
    </li>
  );
}

function StatusSection({ snapshot }: { snapshot: OperationsDailyReportSnapshot }) {
  const { statusCounts, totalUniqueTasks } = snapshot.overall;

  return (
    <section aria-labelledby="perf-status">
      <div className={styles.perfSectionHead}>
        <h3 id="perf-status" className={styles.perfSectionTitle}>
          Task status
        </h3>
      </div>

      {/* These three are mutually exclusive and sum to totalUniqueTasks. */}
      <ul className={styles.statusList}>
        <StatusRow
          label="Completed"
          count={statusCounts.completed}
          total={totalUniqueTasks}
          tone="completed"
        />
        <StatusRow
          label="In Progress"
          count={statusCounts.inProgress}
          total={totalUniqueTasks}
          tone="in-progress"
        />
        <StatusRow
          label="Pending"
          count={statusCounts.pending}
          total={totalUniqueTasks}
          tone="pending"
        />
      </ul>

      {/* Overdue is a FLAG on incomplete tasks, not a fourth status. A task
          can be both In Progress and overdue, so it is shown separately —
          adding it to the three above would produce a misleading total. */}
      <div className={styles.statusOverdue}>
        <ul className={styles.statusList}>
          <StatusRow
            label="Overdue"
            count={statusCounts.overdue}
            total={totalUniqueTasks}
            tone="overdue"
          />
        </ul>
        <p className={styles.perfFootnote}>
          Overdue is a flag on tasks that are still incomplete, not a separate
          status — those tasks are already counted above as In Progress or
          Pending.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 3 — NEEDS ATTENTION
   ============================================================ */

interface BlockerItem {
  key: string;
  people: string[];
  taskTitle: string;
  text: string;
}

interface OverdueItem {
  key: string;
  taskTitle: string;
  people: string[];
}

/**
 * De-duplicates blockers across assignees. A blocked task assigned to two
 * people appears once in each employee's blockers array; collapsing on
 * task + text keeps this list consistent with the stored blockerCount and
 * lets us attribute the item to both names.
 */
function collectBlockers(snapshot: OperationsDailyReportSnapshot): BlockerItem[] {
  const byKey = new Map<string, BlockerItem>();

  for (const employee of snapshot.employees) {
    for (const blocker of employee.blockers) {
      const key = `${blocker.taskTitle}||${blocker.text}`;
      const existing = byKey.get(key);

      if (existing) {
        if (!existing.people.includes(employee.name)) {
          existing.people.push(employee.name);
        }
      } else {
        byKey.set(key, {
          key,
          people: [employee.name],
          taskTitle: blocker.taskTitle,
          text: blocker.text,
        });
      }
    }
  }

  return Array.from(byKey.values());
}

/** Unique overdue tasks, so the list length matches statusCounts.overdue. */
function collectOverdue(snapshot: OperationsDailyReportSnapshot): OverdueItem[] {
  const byTaskId = new Map<string, OverdueItem>();

  const register = (task: OperationsTask, person: string | null) => {
    const existing = byTaskId.get(task.id);
    if (existing) {
      if (person && !existing.people.includes(person)) existing.people.push(person);
      return;
    }
    byTaskId.set(task.id, {
      key: task.id,
      taskTitle: task.title,
      people: person ? [person] : [],
    });
  };

  for (const employee of snapshot.employees) {
    for (const task of employee.overdueTasks) register(task, employee.name);
  }
  for (const task of snapshot.unassignedTasks) {
    if (task.isOverdue) register(task, null);
  }

  return Array.from(byTaskId.values());
}

/** Zero-padded display only — "04" instead of "4". Never changes the underlying count. */
function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function AttentionSection({ snapshot }: { snapshot: OperationsDailyReportSnapshot }) {
  const blockers = useMemo(() => collectBlockers(snapshot), [snapshot]);
  const overdue = useMemo(() => collectOverdue(snapshot), [snapshot]);

  const overdueCount = snapshot.overall.statusCounts.overdue;
  const blockerCount = snapshot.overall.blockerCount;
  const nothingToFlag = overdueCount === 0 && blockerCount === 0;

  return (
    <section aria-labelledby="perf-attention">
      <div className={styles.perfSectionHead}>
        <h3 id="perf-attention" className={styles.perfSectionTitle}>
          Needs attention
        </h3>
      </div>

      {nothingToFlag ? (
        <p className={styles.perfEmptyLine}>
          No overdue tasks. No major blockers reported.
        </p>
      ) : (
        <>
          <div className={styles.attentionSummary}>
            <div className={styles.attentionStat}>
              <div className={styles.attentionStatValue} data-tone="overdue">
                {pad2(overdueCount)}
              </div>
              <div className={styles.attentionStatLabel}>Overdue tasks</div>
            </div>
            <div className={styles.attentionStat}>
              <div className={styles.attentionStatValue} data-tone="blocker">
                {pad2(blockerCount)}
              </div>
              <div className={styles.attentionStatLabel}>Blockers</div>
            </div>
          </div>

          {overdue.length > 0 && (
            <div className={styles.attentionGroup}>
              <h4 className={styles.attentionGroupTitle}>Overdue</h4>
              <ul className={styles.attentionList}>
                {overdue.slice(0, MAX_ATTENTION_ITEMS).map((item) => (
                  <li
                    key={item.key}
                    className={styles.attentionItem}
                    data-tone="overdue"
                  >
                    <span className={styles.attentionWho}>
                      {item.people.length > 0
                        ? item.people.join(", ")
                        : "Unassigned"}
                    </span>
                    <span className={styles.attentionWhat}>{item.taskTitle}</span>
                  </li>
                ))}
              </ul>
              {overdue.length > MAX_ATTENTION_ITEMS && (
                <p className={styles.perfFootnote}>
                  +{overdue.length - MAX_ATTENTION_ITEMS} more — see Team Tasks.
                </p>
              )}
            </div>
          )}

          {blockers.length > 0 && (
            <div className={styles.attentionGroup}>
              <h4 className={styles.attentionGroupTitle}>Blockers</h4>
              <ul className={styles.attentionList}>
                {blockers.slice(0, MAX_ATTENTION_ITEMS).map((item) => (
                  <li
                    key={item.key}
                    className={styles.attentionItem}
                    data-tone="blocker"
                  >
                    <span className={styles.attentionWho}>
                      {item.people.join(", ")}
                    </span>
                    {/* The actual BLOCKER: text recorded in Planner that day.
                        Never paraphrased, never AI-generated. */}
                    <span className={styles.attentionWhat}>{item.text}</span>
                    <span className={styles.attentionTask}>{item.taskTitle}</span>
                  </li>
                ))}
              </ul>
              {blockers.length > MAX_ATTENTION_ITEMS && (
                <p className={styles.perfFootnote}>
                  +{blockers.length - MAX_ATTENTION_ITEMS} more — see Team Tasks.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ============================================================
   PANEL
   ============================================================ */

export function PerformancePanel({
  snapshot,
}: {
  snapshot: OperationsDailyReportSnapshot;
}) {
  // A report exists, but it recorded no tasks. Not a zero-performance day.
  if (snapshot.overall.totalUniqueTasks === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyTitle}>
          No team tasks were recorded for this report date.
        </div>
        <p>
          A report was captured, but it contained no Main Operations tasks, so
          there is no performance to show.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.perfPage}>
      <PerformanceOverview snapshot={snapshot} />

      <EmployeesSection snapshot={snapshot} />

      <div className={styles.perfSection}>
        <div className={styles.perfLowerGrid}>
          <StatusSection snapshot={snapshot} />
          <AttentionSection snapshot={snapshot} />
        </div>
      </div>
    </div>
  );
}