import type { ProfitabilityHealthBand } from "@/lib/profitability/calculations";

/**
 * The health bar always draws four EQUAL-WIDTH segments (0–25%,
 * 25–50%, 50–75%, 75–100%) regardless of the target margin, so the
 * bar always looks the same shape. What changes with the target is
 * where the MARKER lands inside those segments, and the tick labels
 * printed underneath them.
 */
const SEGMENT_BOUNDS: Record<ProfitabilityHealthBand, [number, number]> = {
  red: [0, 25],
  orange: [25, 50],
  yellow: [50, 75],
  green: [75, 100],
};

type NumericRange = { start: number; end: number };

/**
 * The real-world margin-% range each band covers, for a given target.
 *
 * red and green are open-ended in reality (a margin can be any amount
 * below 0 or above target). For POSITIONING the marker only, they are
 * given a practical floor/ceiling so a very bad or very good number
 * still lands somewhere sensible on the bar instead of off the edge.
 */
function getBandNumericRanges(
  targetMarginPercent: number
): Record<ProfitabilityHealthBand, NumericRange> {
  const halfTarget = targetMarginPercent / 2;

  // Practical floor/ceiling for scaling the red and green segments.
  // Falls back to a fixed spread when the target itself is 0, so the
  // bar isn't degenerate.
  const redFloor = targetMarginPercent > 0 ? -targetMarginPercent : -5;
  const greenCeiling = targetMarginPercent > 0 ? targetMarginPercent * 2 : 5;

  return {
    red: { start: redFloor, end: 0 },
    orange: { start: 0, end: halfTarget },
    yellow: { start: halfTarget, end: targetMarginPercent },
    green: { start: targetMarginPercent, end: greenCeiling },
  };
}

/**
 * Where (0–100, as a bar percentage) the marker should sit for a given
 * margin %, target margin %, and the band it has already been
 * classified into (via getProfitabilityHealthBand).
 */
export function getHealthMarkerPercent(
  marginPercentOfLandingCost: number | null,
  targetMarginPercent: number,
  band: ProfitabilityHealthBand
): number {
  if (marginPercentOfLandingCost === null) {
    return 0;
  }

  const range = getBandNumericRanges(targetMarginPercent)[band];
  const [barStart, barEnd] = SEGMENT_BOUNDS[band];

  const span = range.end - range.start;
  const ratio =
    span === 0
      ? 1
      : Math.min(
          1,
          Math.max(0, (marginPercentOfLandingCost - range.start) / span)
        );

  return barStart + ratio * (barEnd - barStart);
}

/**
 * Tick labels printed under the 0%, 25%, 50%, 75%, 100% marks, so the
 * viewer can see the actual margin-% values the bands represent for
 * THIS target, not just generic band names.
 */
export function getHealthBarTicks(
  targetMarginPercent: number
): { positionPercent: number; label: string }[] {
  const halfTarget = targetMarginPercent / 2;

  return [
    { positionPercent: 25, label: "0%" },
    { positionPercent: 50, label: `${halfTarget.toFixed(1)}%` },
    { positionPercent: 75, label: `${targetMarginPercent.toFixed(1)}%` },
  ];
}