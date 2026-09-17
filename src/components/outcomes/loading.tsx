import styles from "./loading.module.css";

export default function OutcomesLoading() {
  return (
    <main className={styles.loadingPage}>
      <div className={styles.loadingHeader}>
        <div className={`${styles.skeleton} ${styles.logo}`} />

        <div className={styles.headerText}>
          <div className={`${styles.skeleton} ${styles.title}`} />
          <div className={`${styles.skeleton} ${styles.subtitle}`} />
        </div>
      </div>

      <div className={styles.loadingLayout}>
        <aside className={styles.sidebar}>
          <div className={`${styles.skeleton} ${styles.sidebarHeading}`} />

          <div className={styles.yearGroup}>
            <div className={`${styles.skeleton} ${styles.year}`} />
            <div className={`${styles.skeleton} ${styles.month}`} />
            <div className={`${styles.skeleton} ${styles.month}`} />
            <div className={`${styles.skeleton} ${styles.month}`} />
            <div className={`${styles.skeleton} ${styles.month}`} />
          </div>

          <div className={styles.yearGroup}>
            <div className={`${styles.skeleton} ${styles.year}`} />
          </div>

          <div className={styles.yearGroup}>
            <div className={`${styles.skeleton} ${styles.year}`} />
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.productSkeletons}>
            <div className={`${styles.skeleton} ${styles.productCard}`} />
            <div className={`${styles.skeleton} ${styles.productCard}`} />
            <div className={`${styles.skeleton} ${styles.productCard}`} />
          </div>

          <div className={styles.mainSkeleton}>
            <div className={`${styles.skeleton} ${styles.mainTitle}`} />

            <div className={styles.metricRow}>
              <div className={`${styles.skeleton} ${styles.metric}`} />
              <div className={`${styles.skeleton} ${styles.metric}`} />
              <div className={`${styles.skeleton} ${styles.metric}`} />
            </div>

            <div className={styles.chartSkeleton}>
              <div className={`${styles.skeleton} ${styles.chart}`} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}