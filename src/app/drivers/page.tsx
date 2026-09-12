import { DriverMapLoader } from "@/components/drivers/DriverMapLoader";
import { DriverPicker } from "@/components/drivers/DriverPicker";
import { getDriversAndVehicles } from "@/lib/delivery/actions";
import styles from "./page.module.css";

export default async function DriversPage() {
  const { drivers } = await getDriversAndVehicles();

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.pageTitle}>Driver Activity</h1>
          <p className={styles.subtitle}>Driver location monitoring interface</p>
        </div>
      </div>

      <section aria-label="Find your deliveries">
        <DriverPicker drivers={drivers} />
      </section>

      <section className={styles.mapWrap} aria-label="Lagos driver activity map">
        <DriverMapLoader />
      </section>
    </div>
  );
}