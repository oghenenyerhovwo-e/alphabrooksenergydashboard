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
      setPendingOutcome(
        nextStatus as "LOST" | "UNQUALIFIED" | "NOT_INTERESTED",
      );
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
        requiresReason ? reason : undefined,
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
    status === "NOT_INTERESTED" ||
    status === "CUSTOMER"
  ) {
    return null;
  }

  const isNew = status === "NEW";
  const isFollowUp = status === "FOLLOW_UP";
  const isProspect = status === "PROSPECT";

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>NEXT ACTION</div>
          <h2 className={styles.title}>Lead Progression</h2>
          <p className={styles.subtitle}>
            Move this lead through the commercial pipeline in order.
          </p>
        </div>

        <span className={styles.currentStatus} data-status={status}>
          {status === "NEW"
            ? "New Lead"
            : status === "FOLLOW_UP"
              ? "Follow-up"
              : "Prospect"}
        </span>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.pipeline}>
        <div className={styles.pipelineStep} data-active={isNew}>
          <span className={styles.stepNumber}>1</span>
          <div>
            <strong>New</strong>
            <span>Lead received</span>
          </div>
        </div>

        <div className={styles.connector} />

        <div className={styles.pipelineStep} data-active={isFollowUp}>
          <span className={styles.stepNumber}>2</span>
          <div>
            <strong>Follow-up</strong>
            <span>Contact and qualify</span>
          </div>
        </div>

        <div className={styles.connector} />

        <div className={styles.pipelineStep} data-active={isProspect}>
          <span className={styles.stepNumber}>3</span>
          <div>
            <strong>Prospect</strong>
            <span>Commercial opportunity</span>
          </div>
        </div>
      </div>

      {!pendingOutcome && (
        <div className={styles.nextAction}>
          <div className={styles.nextActionLabel}>RECOMMENDED NEXT STEP</div>

          {isNew && (
            <>
              <div className={styles.nextActionTitle}>
                Start the follow-up
              </div>
              <p className={styles.nextActionText}>
                Contact the lead and begin qualification before moving it to
                Prospect.
              </p>

              <button
                type="button"
                disabled={isPending}
                onClick={() => transition("FOLLOW_UP")}
                className={styles.primaryAction}
              >
                {isPending ? "Updating…" : "Start Follow-up →"}
              </button>
            </>
          )}

          {isFollowUp && (
            <>
              <div className={styles.nextActionTitle}>
                Convert to Prospect
              </div>
              <p className={styles.nextActionText}>
                This lead is already in follow-up. If the opportunity is
                genuine, move it forward to Prospect.
              </p>

              <button
                type="button"
                disabled={isPending}
                onClick={() => transition("PROSPECT")}
                className={styles.primaryAction}
              >
                {isPending ? "Updating…" : "Mark as Prospect →"}
              </button>
            </>
          )}

          {isProspect && (
            <>
              <div className={styles.nextActionTitle}>
                Prospect is ready for Customer conversion
              </div>
              <p className={styles.nextActionText}>
                Use the Customer Conversion panel below to register this
                Prospect as a Customer in Zoho Books.
              </p>

              <div className={styles.readyNotice}>
                ✓ Prospect stage reached
              </div>
            </>
          )}
        </div>
      )}

      {pendingOutcome && (
        <div className={styles.outcomeBox}>
          <div className={styles.outcomeTitle}>Record unsuccessful outcome</div>

          <p className={styles.outcomeText}>
            A reason is required before this lead can be closed.
          </p>

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

          <div className={styles.outcomeActions}>
            <button
              type="button"
              className={styles.cancelButton}
              disabled={isPending}
              onClick={() => {
                setPendingOutcome(null);
                setReason("");
                setError(null);
              }}
            >
              Cancel
            </button>

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
              className={styles.confirmOutcome}
            >
              {isPending ? "Saving…" : "Confirm Outcome"}
            </button>
          </div>
        </div>
      )}

      {!pendingOutcome && (
        <div className={styles.outcomes}>
          <div className={styles.outcomesLabel}>
            NOT MOVING FORWARD
          </div>

          <div className={styles.outcomeButtons}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("NOT_INTERESTED")}
              className={styles.outcomeButton}
            >
              Not Interested
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("UNQUALIFIED")}
              className={styles.outcomeButton}
            >
              Unqualified
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => transition("LOST")}
              className={styles.outcomeButton}
            >
              Lost
            </button>
          </div>
        </div>
      )}
    </section>
  );
}