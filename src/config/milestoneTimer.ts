export const MILESTONE_TIMER_CONFIG = {
  title: "10-Day to Submit documents",
  startDate: "2026-09-02T00:00:00",
  endDate: "2026-09-12T23:59:59",
} as const;

export type MilestoneTimerStatus = "pending" | "in-progress" | "completed";