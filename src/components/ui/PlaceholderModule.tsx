import styles from "./PlaceholderModule.module.css";

export function PlaceholderModule({ title }: { title: string }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.eyebrow}>{title}</div>
      <p className={styles.text}>Module coming in a later implementation phase.</p>
    </div>
  );
}