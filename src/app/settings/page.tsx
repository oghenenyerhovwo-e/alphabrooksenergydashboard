"use client";

import { useCngData } from "@/context/CngDataContext";
import { DataUnavailable } from "@/components/ui/DataUnavailable";
import styles from "./page.module.css";
import { buildAriaContext } from "@/lib/aria/context";
// ...inside SettingsPage component, after the existing useCngData() call:



export default function SettingsPage() {
  const { tasks, buckets, users, status, lastUpdated, refresh } = useCngData();
  const ariaContext = buildAriaContext(tasks, buckets, users, status ?? "not_connected", lastUpdated);
  console.log("ARIA CONTEXT:", ariaContext);


  return (
    <div className={styles.stack}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Data Connection</h3>
        {status !== "connected" ? (
          <DataUnavailable detail="Microsoft Graph credentials are not configured." />
        ) : (
          <div className={styles.rows}>
            <Row label="Graph connection" value="Connected" />
            <Row label="Last data update" value={lastUpdated ?? "—"} />
            <Row label="Task count" value={String(tasks.length)} />
            <Row label="Bucket count" value={String(buckets.length)} />
            <Row label="User count" value={String(users.length)} />
          </div>
        )}
        <button className={styles.refresh} onClick={refresh}>
          Refresh Data
        </button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Reporting</h3>
        <div className={styles.rows}>
          <button className={styles.disabledBtn} disabled>
            Export (coming later)
          </button>
          <button className={styles.disabledBtn} disabled>
            Print (coming later)
          </button>
        </div>
      </section>

      <section className={styles.devSection}>
        <h3 className={styles.sectionTitle}>Developer Data Tools</h3>
        <p className={styles.devNote}>
          Reserved for local development only — not surfaced as a normal management control.
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.row}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}