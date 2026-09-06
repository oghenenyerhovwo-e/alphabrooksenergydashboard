import styles from "./DataUnavailable.module.css";

export function DataUnavailable({
  label = "DATA SOURCE NOT CONNECTED",
  detail,
}: {
  label?: string;
  detail?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.dot} />
      <div>
        <div className={styles.label}>{label}</div>
        {detail && <div className={styles.detail}>{detail}</div>}
      </div>
    </div>
  );
}