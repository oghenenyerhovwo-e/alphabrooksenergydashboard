/**
 * MAIN OPERATIONS — REPORTING DATE UTILITIES (Phase 6)
 *
 * The reporting date is an Africa/Lagos CALENDAR DATE, not a timestamp.
 * It is represented everywhere as the string "YYYY-MM-DD".
 *
 * Why a string and not a Date: a Date/DateTime round-trips through UTC
 * in the database driver and in the browser, which is the most common
 * way a Lagos report date silently becomes the previous day on a UTC
 * server. A "YYYY-MM-DD" string cannot drift.
 */

export const OPERATIONS_REPORT_TIMEZONE = "Africa/Lagos";

/** Matches "YYYY-MM-DD" structurally. Real-calendar validity is checked separately. */
const REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The Africa/Lagos calendar date for a given instant, as "YYYY-MM-DD".
 * "en-CA" is used because its short date format is already ISO-ordered.
 */
export function getLagosReportDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONS_REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** True only for a structurally valid AND real calendar date (rejects 2026-02-30). */
export function isValidReportDate(value: unknown): value is string {
  if (typeof value !== "string" || !REPORT_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const asUtc = new Date(Date.UTC(year, month - 1, day));

  return (
    asUtc.getUTCFullYear() === year &&
    asUtc.getUTCMonth() === month - 1 &&
    asUtc.getUTCDate() === day
  );
}

/**
 * "2026-09-15" -> "15 September 2026".
 *
 * Formats through Date.UTC + timeZone "UTC" deliberately: the string
 * already IS the Lagos calendar date, so re-interpreting it in any
 * other zone would shift it. Returns the raw input unchanged if it is
 * not a valid report date, rather than inventing a label.
 */
export function formatReportDateLabel(reportDate: string): string {
  if (!isValidReportDate(reportDate)) return reportDate;

  const [year, month, day] = reportDate.split("-").map(Number);

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** First and last Lagos calendar dates of the month containing `reportDate`. Used for calendar-month queries. */
export function getReportMonthRange(reportDate: string): { from: string; to: string } {
  if (!isValidReportDate(reportDate)) {
    const today = getLagosReportDate();
    return getReportMonthRange(today);
  }

  const [year, month] = reportDate.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");

  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}