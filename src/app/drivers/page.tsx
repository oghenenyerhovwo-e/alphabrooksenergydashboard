import { DriverMapLoader } from "@/components/drivers/DriverMapLoader";
import styles from "./page.module.css";

export default function DriversPage() {
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Driver Activity</h1>
          <p className={styles.subtitle}>Driver location monitoring interface</p>
        </div>
      </div>

      <section className={styles.mapWrap} aria-label="Lagos driver activity map">
        <DriverMapLoader />
      </section>
    </div>
  );
}