/**
 * Outcomes derived business calculations.
 *
 * Nothing here is persisted (spec §17) — these are pure functions over
 * plain numbers, always called on values already unwrapped via
 * src/lib/outcomes/decimal.ts::toOutcomeNumber(OrNull).
 *
 * MISSING vs ZERO: every function that takes an "achievement" value
 * accepts `number | null`, where `null` means "no achievement record
 * exists for this staff/product/month" and `0` means "a record exists
 * and its value is zero." These are never conflated (spec §9/§16).
 *
 * ZERO-DIVISION CONVENTION: matches the existing convention in
 * src/lib/cng/calculations.ts (calculateCompletionPercentage) — a
 * percentage with a zero or invalid denominator returns `null`, never
 * NaN or Infinity, and is never fabricated.
 */

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * achievement / target × 100.
 * - `null` if achievement is missing (not yet entered).
 * - `null` if target is 0, negative, or not finite (never divide by zero).
 * - Achievement may exceed target — this can legitimately return > 100.
 */
export function calculateAchievementPercentage(
  achievement: number | null,
  target: number
): number | null {
  if (achievement === null) return null;
  if (!Number.isFinite(target) || target <= 0) return null;
  return roundToTwoDecimals((achievement / target) * 100);
}

/**
 * max(target - achievement, 0). Achievement is NEVER capped at target
 * (spec §15) — outstanding simply floors at zero once target is met or
 * exceeded. A missing achievement is treated as "nothing recorded
 * toward this target yet," so the full target is outstanding — this is
 * a deliberate, documented choice (not a silent missing→0 coercion of
 * the *achievement value itself*, which callers must still track
 * separately when they need to distinguish "0% - nothing entered" from
 * "0% - entered as zero" for display, per calculateAchievementPercentage above).
 */
export function calculateOutstanding(target: number, achievement: number | null): number {
  const achieved = achievement ?? 0;
  return Math.max(target - achieved, 0);
}

/** Sum of individual targets. Targets are always concrete numbers (never "missing"). */
export function calculateTeamTarget(targets: number[]): number {
  return roundToTwoDecimals(targets.reduce((sum, t) => sum + t, 0));
}

/**
 * Sum of ACTUAL ENTERED achievements only.
 * - Pass `null` for any staff member with no achievement record.
 * - Returns `null` if every entry is missing (no one has entered
 *   anything yet for this product/month) — this is NOT the same as a
 *   team achievement of 0, which means every eligible staff member
 *   entered a value and those values summed to zero.
 */
export function calculateTeamAchievement(achievements: Array<number | null>): number | null {
  const entered = achievements.filter((a): a is number => a !== null);
  if (entered.length === 0) return null;
  return roundToTwoDecimals(entered.reduce((sum, a) => sum + a, 0));
}

/** max(teamTarget - teamAchievement, 0). Same missing-treated-as-zero rule as calculateOutstanding. */
export function calculateTeamOutstanding(teamTarget: number, teamAchievement: number | null): number {
  return calculateOutstanding(teamTarget, teamAchievement);
}

/** teamAchievement / teamTarget × 100, same zero-division/missing rules as calculateAchievementPercentage. */
export function calculateTeamAchievementPercentage(
  teamAchievement: number | null,
  teamTarget: number
): number | null {
  return calculateAchievementPercentage(teamAchievement, teamTarget);
}

/**
 * individualAchievement / teamAchievement × 100.
 * - `null` if the individual has no achievement entered.
 * - `null` if the team achievement is missing (no one has entered anything) or is 0
 *   (a real, entered team total of zero — contribution to zero is undefined, not 0%).
 * NOTE: this is a DIFFERENT metric from achievement percentage (spec §5) —
 *   contribution is share-of-team-output, not progress-against-target.
 */
export function calculateContributionPercentage(
  individualAchievement: number | null,
  teamAchievement: number | null
): number | null {
  if (individualAchievement === null) return null;
  if (teamAchievement === null || teamAchievement === 0) return null;
  return roundToTwoDecimals((individualAchievement / teamAchievement) * 100);
}

/** Convenience bundle for one staff member's full monthly performance picture. */
export interface StaffOutcomePerformance {
  target: number;
  achievement: number | null;
  outstanding: number;
  achievementPercentage: number | null;
}

export function calculateStaffOutcomePerformance(
  target: number,
  achievement: number | null
): StaffOutcomePerformance {
  return {
    target,
    achievement,
    outstanding: calculateOutstanding(target, achievement),
    achievementPercentage: calculateAchievementPercentage(achievement, target),
  };
}

/** Convenience bundle for a team's full monthly performance picture. */
export interface TeamOutcomePerformance {
  teamTarget: number;
  teamAchievement: number | null;
  teamOutstanding: number;
  teamAchievementPercentage: number | null;
}

export function calculateTeamOutcomePerformance(
  targets: number[],
  achievements: Array<number | null>
): TeamOutcomePerformance {
  const teamTarget = calculateTeamTarget(targets);
  const teamAchievement = calculateTeamAchievement(achievements);
  return {
    teamTarget,
    teamAchievement,
    teamOutstanding: calculateTeamOutstanding(teamTarget, teamAchievement),
    teamAchievementPercentage: calculateTeamAchievementPercentage(teamAchievement, teamTarget),
  };
}