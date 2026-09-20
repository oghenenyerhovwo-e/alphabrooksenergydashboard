"use client";

import { useState, useTransition } from "react";
import { transitionLeadAction } from "@/lib/commercial/actions";
import styles from "./LeadQualificationPanel.module.css";

type LeadStatus =
  | "NEW"
  | "FOLLOW_UP"
  | "PROSPECT"
  | "CUSTOMER"
  | "LOST"
  | "UNQUALIFIED"
  | "NOT_INTERESTED";

export function LeadQualificationPanel({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<
    "LOST" | "UNQUALIFIED" | "NOT_INTERESTED" | null
  >(null);

  const [isPending, startTransition] = useTransition();

  function transition(nextStatus: LeadStatus) {
    const requiresReason =
      nextStatus === "LOST" ||
      nextStatus === "UNQUALIFIED" ||
      nextStatus === "NOT_INTERESTED";

    if (requiresReason && pendingOutcome !== nextStatus) {
      setPendingOutcome(nextStatus);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await transitionLeadAction(
        leadId,
        nextStatus as
          | "FOLLOW_UP"
          | "PROSPECT"
          | "LOST"
          | "UNQUALIFIED"
          | "NOT_INTERESTED",
        requiresReason ? reason : undefined
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      window.location.reload();
    });
  }

  if (
    status === "LOST" ||
    status === "UNQUALIFIED" ||
    status === "NOT_INTERESTED"
  ) {
    return null;
  }

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>Lead Progression</h2>

      <p className={styles.subtitle}>
        Move this lead through the commercial qualification lifecycle.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {pendingOutcome && (
        <label className={styles.reasonField}>
          <span className={styles.reasonLabel}>Outcome reason</span>

          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className={styles.textarea}
            placeholder="Record why this lead reached this outcome…"
          />
        </label>
      )}

      <div className={styles.actions}>
        {status === "NEW" && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => transition("FOLLOW_UP")}
            className={styles.qualifyBtn}
          >
            {isPending ? "Working…" : "Start Follow-up"}
          </button>
        )}

        {(status === "NEW" || status === "FOLLOW_UP") && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => transition("PROSPECT")}
            className={styles.qualifyBtn}
          >
            {isPending ? "Working…" : "Mark Prospect"}
          </button>
        )}

        {status === "NEW" || status === "FOLLOW_UP" || status === "PROSPECT" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("NOT_INTERESTED")}
              className={styles.disqualifyBtn}
            >
              Not Interested
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("UNQUALIFIED")}
              className={styles.disqualifyBtn}
            >
              Unqualified
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("LOST")}
              className={styles.disqualifyBtn}
            >
              Lost
            </button>
          </>
        ) : null}

        {pendingOutcome && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (reason.trim().length === 0) {
                setError("A reason is required.");
                return;
              }

              transition(pendingOutcome);
            }}
            className={styles.disqualifyBtn}
          >
            {isPending ? "Saving…" : "Confirm Outcome"}
          </button>
        )}
      </div>
    </section>
  );
}