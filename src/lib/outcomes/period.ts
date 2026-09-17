/**
 * Outcomes performance periods are identified by normalized (year,
 * month) integers — never a display string like "January 2026", and
 * never the existing Operations daily-reports calendar
 * (src/lib/operations/report-date.ts), which is a different concept
 * (a specific Africa/Lagos calendar date) for a different domain.
 */

/**
 * Lower bound only. There is deliberately NO upper bound baked into
 * validation beyond a generous sanity ceiling — the business needs
 * 2026/2027/2028 today, but nothing here hardcodes "only those three
 * years may ever exist." A new year works the moment someone creates
 * a target/achievement for it; no code or schema change required.
 */
export const MIN_OUTCOME_YEAR = 2026;
/** Sanity ceiling only, to reject obviously-wrong input (typos, etc.). */
export const MAX_OUTCOME_YEAR = 2100;

export function isValidOutcomeMonth(month: unknown): month is number {
  return typeof month === "number" && Number.isInteger(month) && month >= 1 && month <= 12;
}

export function isValidOutcomeYear(year: unknown): year is number {
  return (
    typeof year === "number" &&
    Number.isInteger(year) &&
    year >= MIN_OUTCOME_YEAR &&
    year <= MAX_OUTCOME_YEAR
  );
}

export interface OutcomePeriod {
  year: number;
  month: number;
}

/** Used later (Phase 3) to default a navigator to "now" in Africa/Lagos time. */
export function getCurrentOutcomePeriod(referenceDate: Date = new Date()): OutcomePeriod {
  return { year: referenceDate.getFullYear(), month: referenceDate.getMonth() + 1 };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/**
 * Display-only formatting. This string must NEVER be used as a
 * database key or lookup identity — only (year, month) integers are.
 */
export function formatOutcomePeriod(period: OutcomePeriod): string {
  return `${MONTH_NAMES[period.month - 1]} ${period.year}`;
}