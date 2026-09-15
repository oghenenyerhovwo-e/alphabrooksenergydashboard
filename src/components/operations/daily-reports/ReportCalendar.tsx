"use client";

/**
 * MAIN OPERATIONS — REPORT HISTORY CALENDAR (Phase 7)
 *
 * A reporting calendar, not a scheduler: it selects a past reporting date
 * and nothing else. No events, no task creation, no drag and drop.
 *
 * Every date is an Africa/Lagos calendar date in "YYYY-MM-DD" form. All
 * arithmetic below runs through Date.UTC on those strings, so the
 * browser's timezone can never shift a reporting date — the same reason
 * Phase 6 stores reportDate as a string rather than a timestamp.
 *
 * Deliberately hand-written: the project has no calendar component and no
 * date library, and this needs ~120 lines. Adding a dependency for it
 * would not be justified.
 */

import { useMemo } from "react";
import styles from "./daily-reports.module.css";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ============================================================
   ICONS
   Small hand-written inline SVGs — the project has no icon
   library installed, and this is not enough surface area to
   justify adding one.
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

function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </IconBase>
  );
}

function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <polyline points="6 9 12 15 18 9" />
    </IconBase>
  );
}

function PanelLeftCloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M10 4v16" />
      <path d="M15 9l-2.5 3 2.5 3" />
    </IconBase>
  );
}

interface ReportCalendarProps {
  /** Visible month, "YYYY-MM". */
  monthKey: string;
  /** Currently selected reporting date, "YYYY-MM-DD". */
  selectedDate: string;
  /** Today in Africa/Lagos, "YYYY-MM-DD". Dates after this are disabled. */
  today: string;
  /** Dates in the visible month that have a stored report. */
  datesWithReports: Set<string>;
  /** True while the month index is being fetched. */
  indexLoading: boolean;
  /** Whether the calendar is showing its compact, minimized control. */
  collapsed: boolean;
  onMonthChange: (monthKey: string) => void;
  onSelectDate: (date: string) => void;
  onToggleCollapsed: () => void;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return { year, month };
}

function shiftMonth(monthKey: string, delta: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const zeroBased = month - 1 + delta;
  const nextYear = year + Math.floor(zeroBased / 12);
  const nextMonth = ((zeroBased % 12) + 12) % 12;
  return `${nextYear}-${pad(nextMonth + 1)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 0 = Monday … 6 = Sunday. */
function mondayFirstWeekday(year: number, month: number, day: number): number {
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (sundayFirst + 6) % 7;
}

function monthLabel(monthKey: string): string {
  const { year, month } = parseMonthKey(monthKey);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dayAccessibleLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function ReportCalendar({
  monthKey,
  selectedDate,
  today,
  datesWithReports,
  indexLoading,
  collapsed,
  onMonthChange,
  onSelectDate,
  onToggleCollapsed,
}: ReportCalendarProps) {
  const cells = useMemo(() => {
    const { year, month } = parseMonthKey(monthKey);
    const leadingBlanks = mondayFirstWeekday(year, month, 1);
    const total = daysInMonth(year, month);

    const result: Array<{ key: string; date: string | null }> = [];

    for (let i = 0; i < leadingBlanks; i += 1) {
      result.push({ key: `blank-${i}`, date: null });
    }
    for (let day = 1; day <= total; day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      result.push({ key: date, date });
    }
    return result;
  }, [monthKey]);

  const todayMonthKey = today.slice(0, 7);
  // Never navigate past the current Africa/Lagos month — there can be no
  // report for a day that hasn't happened.
  const canGoForward = monthKey < todayMonthKey;

  /* ---- minimized state ----
   * A deliberately-designed compact control, not a clipped version of
   * the full calendar. Month navigation and the current selection stay
   * reachable without the grid taking up permanent space.
   */
  if (collapsed) {
    return (
      <section
        className={styles.calendarCard}
        data-collapsed="true"
        aria-label="Report history calendar (minimized)"
      >
        <div className={styles.calendarMini}>
          <div className={styles.calendarMiniNav}>
            <button
              type="button"
              className={styles.monthNav}
              onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>

            <span className={styles.calendarMiniMonth} aria-live="polite">
              {monthLabel(monthKey)}
            </span>

            <button
              type="button"
              className={styles.monthNav}
              onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
              disabled={!canGoForward}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className={styles.calendarMiniSelected}>
            <span className={styles.calendarMiniSelectedLabel}>Selected</span>
            <span className={styles.calendarMiniSelectedValue}>
              {dayAccessibleLabel(selectedDate)}
            </span>
          </div>

          <button
            type="button"
            className={styles.calendarExpandButton}
            onClick={onToggleCollapsed}
            aria-expanded={false}
          >
            <CalendarIcon size={14} />
            Show calendar
            <ChevronDownIcon size={14} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.calendarCard} aria-label="Report history calendar">
      <div className={styles.calendarHead}>
        <button
          type="button"
          className={styles.monthNav}
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>

        <div className={styles.monthLabelWrap}>
          <span className={styles.monthLabel} aria-live="polite">
            {monthLabel(monthKey)}
          </span>
          {indexLoading && <span className={styles.monthLoading}>Loading…</span>}
        </div>

        <button
          type="button"
          className={styles.monthNav}
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          disabled={!canGoForward}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className={styles.calendarActions}>
        <button
          type="button"
          className={styles.todayButton}
          onClick={() => {
            onMonthChange(todayMonthKey);
            onSelectDate(today);
          }}
        >
          Today
        </button>

        <button
          type="button"
          className={styles.calendarCollapseButton}
          onClick={onToggleCollapsed}
          aria-expanded={true}
          aria-label="Minimize calendar"
        >
          <PanelLeftCloseIcon size={15} />
        </button>
      </div>

      <div className={styles.weekdayRow} aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekday}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.dayGrid} role="grid" aria-label={monthLabel(monthKey)}>
        {cells.map((cell) => {
          if (cell.date === null) {
            return <div key={cell.key} className={styles.dayBlank} aria-hidden="true" />;
          }

          const isFuture = cell.date > today;
          const hasReport = datesWithReports.has(cell.date);
          const isSelected = cell.date === selectedDate;
          const isToday = cell.date === today;
          const dayNumber = Number(cell.date.slice(8, 10));

          return (
            <button
              key={cell.key}
              type="button"
              className={styles.day}
              data-selected={isSelected}
              data-today={isToday}
              data-has-report={hasReport}
              disabled={isFuture}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${dayAccessibleLabel(cell.date)}${
                hasReport ? " — report available" : " — no report"
              }`}
              onClick={() => onSelectDate(cell.date!)}
            >
              <span className={styles.dayNumber}>{dayNumber}</span>
              {hasReport && <span className={styles.dayDot} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <p className={styles.calendarLegend}>
        <span className={styles.legendDot} aria-hidden="true" /> A daily report was
        recorded for this date.
      </p>
    </section>
  );
}