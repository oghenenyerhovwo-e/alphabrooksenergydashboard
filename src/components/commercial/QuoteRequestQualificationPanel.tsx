"use client";

import { useState, useTransition } from "react";
import { qualifyQuoteRequestAction } from "@/lib/commercial/actions";
import styles from "@/components/commercial/LeadQualificationPanel.module.css";

export function QuoteRequestQualificationPanel({
  quoteRequestId,
  qualificationState,
}: {
  quoteRequestId: string;
  qualificationState: "PENDING" | "QUALIFIED" | "DISQUALIFIED";
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showReasonField, setShowReasonField] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (qualificationState !== "PENDING") {
    return null;
  }

  function handleDecision(decision: "QUALIFIED" | "DISQUALIFIED") {
    if (decision === "DISQUALIFIED" && !showReasonField) {
      setShowReasonField(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await qualifyQuoteRequestAction(
        quoteRequestId,
        decision,
        decision === "DISQUALIFIED" ? reason : undefined
      );

      if (result?.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Qualification</h2>
      <p className={styles.subtitle}>
        Decide whether this specific request is viable to proceed.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {showReasonField && (
        <label className={styles.reasonField}>
          <span className={styles.reasonLabel}>Disqualification reason</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className={styles.textarea}
            placeholder="Explain why this quote request is being disqualified…"
          />
        </label>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleDecision("QUALIFIED")}
          className={styles.qualifyBtn}
        >
          {isPending ? "Working…" : "Qualify"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleDecision("DISQUALIFIED")}
          className={styles.disqualifyBtn}
        >
          {showReasonField ? "Confirm Disqualify" : "Disqualify"}
        </button>
      </div>
    </section>
  );
}