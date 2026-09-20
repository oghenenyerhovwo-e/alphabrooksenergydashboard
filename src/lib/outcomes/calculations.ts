import { Prisma } from "@/generated/prisma/client";
import {
  type DecimalInput,
  toOutcomeDecimal,
  toOutcomeNumber,
} from "@/lib/outcomes/decimal";

/**
 * Outcomes derived business calculations.
 *
 * The authoritative financial calculation is:
 *
 * quantity × margin per unit = generated value
 *
 * Financial multiplication is performed with Prisma Decimal.
 *
 * Generic performance calculations such as achievement percentage,
 * outstanding, team aggregation, and contribution continue to operate
 * on plain numbers because they are generic ratio/aggregation
 * functions. Callers should convert Decimal generated values to
 * numbers at that boundary with toOutcomeNumber().
 *
 * MISSING vs ZERO:
 *
 * For achievement values:
 * - null = no achievement record exists
 * - 0    = an achievement record exists and its value is zero
 *
 * These states are intentionally kept separate.
 *
 * ZERO-DIVISION CONVENTION:
 *
 * A percentage with a zero, negative, or invalid denominator returns
 * null rather than NaN or Infinity.
 */

/**
 * Round a percentage/derived display calculation to two decimal
 * places.
 *
 * This preserves the existing Outcomes convention.
 *
 * Financial generated values themselves are NOT rounded here.
 * They remain Decimal until persistence or an explicit presentation
 * boundary.
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Derive generated monetary value from quantity and margin per unit.
 *
 * Authoritative formula:
 *
 * quantity × margin = generated value
 *
 * The calculation is intentionally Decimal-based so that financial
 * multiplication does not rely on JavaScript floating-point
 * arithmetic.
 *
 * No validation policy is applied here. Negative values, if supplied,
 * are mathematically calculated; the validation layer remains
 * responsible for deciding whether such inputs are permitted.
 *
 * The returned Decimal is intentionally NOT rounded to two decimal
 * places here. The database monetary field has its own scale, and
 * subsequent calculations should avoid premature rounding.
 */
export function deriveOutcomeValue(
  quantity: DecimalInput,
  margin: DecimalInput
): Prisma.Decimal {
  const decimalQuantity = toOutcomeDecimal(quantity);
  const decimalMargin = toOutcomeDecimal(margin);

  return decimalQuantity.mul(decimalMargin);
}

/**
 * achievement / target × 100.
 *
 * - null if achievement is missing.
 * - null if target is zero, negative, or not finite.
 * - achievement may exceed target.
 *
 * This function is deliberately generic. It can be used for:
 *
 * actual generated value / target generated value
 *
 * as well as other numerical performance ratios where required.
 */
export function calculateAchievementPercentage(
  achievement: number | null,
  target: number
): number | null {
  if (achievement === null) return null;
  if (!Number.isFinite(target) || target <= 0) return null;
  if (!Number.isFinite(achievement)) return null;

  return roundToTwoDecimals((achievement / target) * 100);
}

/**
 * Calculate outstanding value.
 *
 * Existing project convention:
 *
 * max(target - achievement, 0)
 *
 * A missing achievement is treated as zero for the purpose of
 * outstanding calculation, meaning the full target remains
 * outstanding.
 *
 * The original missing/zero distinction remains available to callers
 * because the achievement argument itself still accepts null.
 */
export function calculateOutstanding(
  target: number,
  achievement: number | null
): number {
  const achieved = achievement ?? 0;

  if (!Number.isFinite(target)) return 0;
  if (!Number.isFinite(achieved)) return Math.max(target, 0);

  return Math.max(target - achieved, 0);
}

/**
 * Sum of individual target values.
 *
 * Targets are expected to be concrete numbers rather than null.
 *
 * In the margin-adjusted architecture, callers should pass generated
 * target values here, NOT raw target quantities.
 */
export function calculateTeamTarget(targets: number[]): number {
  return roundToTwoDecimals(
    targets.reduce((sum, target) => sum + target, 0)
  );
}

/**
 * Sum of entered achievement values only.
 *
 * null means that no achievement record exists.
 * 0 means that an achievement exists and its value is zero.
 *
 * If every entry is missing, return null.
 *
 * In the margin-adjusted architecture, callers should pass generated
 * achievement values here, NOT raw quantities.
 */
export function calculateTeamAchievement(
  achievements: Array<number | null>
): number | null {
  const entered = achievements.filter(
    (achievement): achievement is number => achievement !== null
  );

  if (entered.length === 0) return null;

  return roundToTwoDecimals(
    entered.reduce((sum, achievement) => sum + achievement, 0)
  );
}

/**
 * Team outstanding value.
 *
 * Uses the same outstanding convention as individual performance.
 */
export function calculateTeamOutstanding(
  teamTarget: number,
  teamAchievement: number | null
): number {
  return calculateOutstanding(teamTarget, teamAchievement);
}

/**
 * Team achievement percentage.
 *
 * The supplied values should be generated monetary values when used
 * for Outcomes performance.
 */
export function calculateTeamAchievementPercentage(
  teamAchievement: number | null,
  teamTarget: number
): number | null {
  return calculateAchievementPercentage(teamAchievement, teamTarget);
}

/**
 * Individual contribution to team generated value.
 *
 * Formula:
 *
 * individual actual generated value
 * -------------------------------- × 100
 * team actual generated value
 *
 * Contribution is a share of team output, not progress against target.
 */
export function calculateContributionPercentage(
  individualAchievement: number | null,
  teamAchievement: number | null
): number | null {
  if (individualAchievement === null) return null;
  if (teamAchievement === null || teamAchievement === 0) return null;
  if (!Number.isFinite(individualAchievement)) return null;
  if (!Number.isFinite(teamAchievement)) return null;

  return roundToTwoDecimals(
    (individualAchievement / teamAchievement) * 100
  );
}

/**
 * Convenience bundle for one staff member's monthly performance.
 *
 * These properties are intentionally generic numerical performance
 * values. In the margin-adjusted Outcomes flow, `target` and
 * `achievement` should represent generated monetary values.
 */
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
    achievementPercentage: calculateAchievementPercentage(
      achievement,
      target
    ),
  };
}

/**
 * Convenience bundle for a team's monthly performance.
 *
 * The target and achievement arrays should contain generated monetary
 * values when used for the margin-adjusted Outcomes system.
 */
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
    teamOutstanding: calculateTeamOutstanding(
      teamTarget,
      teamAchievement
    ),
    teamAchievementPercentage: calculateTeamAchievementPercentage(
      teamAchievement,
      teamTarget
    ),
  };
}

/**
 * Convenience helper for converting an authoritative generated value
 * into the number representation expected by the existing generic
 * performance calculation functions.
 *
 * This makes the Decimal → number boundary explicit.
 */
export function outcomeValueToNumber(value: DecimalInput): number {
  return toOutcomeNumber(value);
}