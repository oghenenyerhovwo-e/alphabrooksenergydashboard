import {
  getLagosReportDate,
  isValidReportDate,
} from "@/lib/operations/report-date";
import type { OutcomePeriod } from "@/lib/outcomes/period";

/**
 * SALES LEDGER — PERIODS
 *
 * A sale counts towards the month of its payment date. The payment
 * date is an Africa/Lagos calendar date ("YYYY-MM-DD"), so year and
 * month are read straight from the string — never from local Date
 * getters, which would drift on a UTC server.
 *
 * Months before OUTCOMES_LEDGER_START use legacy OutcomeAchievement
 * rows (read-only); from it onwards, achievement comes from the ledger.
 */

export const OUTCOMES_LEDGER_START: OutcomePeriod = { year: 2026, month: 10 };
export const OUTCOMES_LEDGER_START_DATE = "2026-10-01";

/** "YYYY-MM-DD" (a Lagos calendar date) -> { year, month }. Throws TypeError if !isValidReportDate. */
export function getPaymentPeriod(paymentDate: string): OutcomePeriod {
  if (!isValidReportDate(paymentDate)) {
    throw new TypeError(`"${paymentDate}" is not a valid payment date (expected YYYY-MM-DD).`);
  }

  const [year, month] = paymentDate.split("-").map(Number);

  return { year, month };
}

/** true when (year, month) >= OUTCOMES_LEDGER_START. */
export function isLedgerMonth(period: OutcomePeriod): boolean {
  if (period.year !== OUTCOMES_LEDGER_START.year) {
    return period.year > OUTCOMES_LEDGER_START.year;
  }

  return period.month >= OUTCOMES_LEDGER_START.month;
}

/** Lagos month of an instant: getPaymentPeriod(getLagosReportDate(now)). */
export function getLagosPeriod(now: Date = new Date()): OutcomePeriod {
  return getPaymentPeriod(getLagosReportDate(now));
}
