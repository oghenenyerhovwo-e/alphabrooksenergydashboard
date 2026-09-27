import { ProfitabilityCalculator } from "@/components/profitability/ProfitabilityCalculator";
import styles from "./page.module.css";

export const metadata = {
  title: "Profitability Analysis — Alpha Brooks Energy",
};

/**
 * Standalone profitability analysis page.
 *
 * Phase 3: a fully working calculator with no prefill.
 * Phase 5 will read a `?orderId=` query param here and prefill the
 * order-derived fields (customer, product, volume) from it.
 */
export default function ProfitabilityAnalysisPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL</div>
          <h1 className={styles.title}>Profitability Analysis</h1>
          <p className={styles.subtitle}>
            Landing cost, margin, and customer pricing for a single order.
          </p>
        </div>
      </header>

      <ProfitabilityCalculator />
    </div>
  );
}