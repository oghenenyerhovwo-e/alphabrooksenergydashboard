"use client";

import { useActionState } from "react";
import {
  rejectDeliveryAction,
  failDeliveryAction,
  type DeliveryActionState,
} from "@/lib/delivery/execution-actions";
import styles from "./DeliveryIssueForms.module.css";

interface Props {
  deliveryId: string;
}

const initialState: DeliveryActionState = {};

export function DeliveryIssueForms({
  deliveryId,
}: Props) {
  return (
    <div className={styles.wrapper}>
      <IssueForm
        deliveryId={deliveryId}
        type="REJECTED"
      />

      <IssueForm
        deliveryId={deliveryId}
        type="FAILED"
      />
    </div>
  );
}

function IssueForm({
  deliveryId,
  type,
}: {
  deliveryId: string;
  type: "REJECTED" | "FAILED";
}) {
  const action =
    type === "REJECTED"
      ? rejectDeliveryAction
      : failDeliveryAction;

  const [state, formAction, pending] =
    useActionState(
      action,
      initialState
    );

  const title =
    type === "REJECTED"
      ? "Reject Delivery"
      : "Mark Delivery Failed";

  return (
    <form
      action={formAction}
      className={styles.card}
    >
      <input
        type="hidden"
        name="deliveryId"
        value={deliveryId}
      />

      <input
        type="hidden"
        name="actorName"
        value="Operations"
      />

      <input
        type="hidden"
        name="actorRole"
        value="OPERATIONS"
      />

      <h3 className={styles.title}>
        {title}
      </h3>

      <p className={styles.subtitle}>
        This action cannot be undone from this screen.
      </p>

      {state.error && (
        <div className={styles.error}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={styles.success}>
          {state.success}
        </div>
      )}

      <textarea
        name="issueDescription"
        required
        rows={4}
        className={styles.textarea}
        placeholder={
          type === "REJECTED"
            ? "Explain why the customer rejected the delivery..."
            : "Explain why the delivery failed..."
        }
      />

      {state.fieldErrors
        ?.issueDescription && (
        <p className={styles.fieldError}>
          {
            state.fieldErrors
              .issueDescription
          }
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={styles.submitButton}
      >
        {pending
          ? "Saving..."
          : type === "REJECTED"
            ? "Reject Delivery"
            : "Mark as Failed"}
      </button>
    </form>
  );
}