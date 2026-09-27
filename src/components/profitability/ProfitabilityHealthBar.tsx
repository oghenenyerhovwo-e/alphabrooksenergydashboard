import type { ProfitabilityHealthBand } from "@/lib/profitability/calculations";
import {
  getHealthMarkerPercent,
  getHealthBarTicks,
} from "./healthBarScale";
import styles from "./ProfitabilityHealthBar.module.css";

const BAND_LABELS: Record<ProfitabilityHealthBand, string> = {
  red: "Loss-making",
  orange: "Below target — weak",
  yellow: "Below target — fair",
  green: "At or above target",
};

export function ProfitabilityHealthBar({
  marginPercentOfLandingCost,
  targetMarginPercent,
  band,
}: {
  marginPercentOfLandingCost: number | null;
  targetMarginPercent: number;
  band: ProfitabilityHealthBand;
}) {
  const markerPercent = getHealthMarkerPercent(
    marginPercentOfLandingCost,
    targetMarginPercent,
    band
  );
  const ticks = getHealthBarTicks(targetMarginPercent);

  return (
    <div className={styles.wrap}>
      <div className={styles.barTrack}>
        <div className={`${styles.segment} ${styles.red}`} />
        <div className={`${styles.segment} ${styles.orange}`} />
        <div className={`${styles.segment} ${styles.yellow}`} />
        <div className={`${styles.segment} ${styles.green}`} />

        <div
          className={styles.marker}
          style={{ left: `${markerPercent}%` }}
          title={
            marginPercentOfLandingCost === null
              ? "No margin available"
              : `${marginPercentOfLandingCost.toFixed(2)}%`
          }
        />
      </div>

      <div className={styles.ticks}>
        {ticks.map((tick) => (
          <span
            key={tick.label}
            className={styles.tick}
            style={{ left: `${tick.positionPercent}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div className={styles.badgeRow}>
        <span className={styles.badge} data-tone={band}>
          {BAND_LABELS[band]}
        </span>
        <span className={styles.badgeValue}>
          {marginPercentOfLandingCost === null
            ? "—"
            : `${marginPercentOfLandingCost.toFixed(2)}% margin`}
        </span>
      </div>
    </div>
  );
}