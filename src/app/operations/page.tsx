import { PlaceholderModule } from "@/components/ui/PlaceholderModule";
import styles from "./page.module.css";

export default function OperationsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Main Operations</h1>
      </div>

      <PlaceholderModule title="MAIN OPERATIONS" />

      <p className={styles.note}>
        The Main Operations data source is not yet connected. Once a live operations feed is
        integrated, real operational metrics will appear here instead of this placeholder.
      </p>
    </div>
  );
}