"use client";

import { useEffect } from "react";
import styles from "./error.module.css";

type OutcomesErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function OutcomesError({
  error,
  reset,
}: OutcomesErrorProps) {
  useEffect(() => {
    console.error("Outcomes dashboard error:", error);
  }, [error]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.icon}>!</div>

        <div className={styles.content}>
          <span className={styles.eyebrow}>OUTCOME DASHBOARD</span>

          <h1>We could not load this view.</h1>

          <p>
            The dashboard could not retrieve the outcome information for
            this period. Your existing targets and records have not been
            changed.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => reset()}
            >
              Try again
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}