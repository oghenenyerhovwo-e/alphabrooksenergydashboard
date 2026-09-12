"use client";

import { useActionState } from "react";
import {
  startDeliveryAction,
  type DeliveryActionState,
} from "@/lib/delivery/execution-actions";
import styles from "./StartDeliveryForm.module.css";

interface StartDeliveryFormProps {
  deliveryId: string;
}

const initialState: DeliveryActionState = {};

export function StartDeliveryForm({ deliveryId }: StartDeliveryFormProps) {
  const [state, formAction, pending] = useActionState(
    startDeliveryAction,
    initialState
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="actorName" value="Operations" />
      <input type="hidden" name="actorRole" value="OPERATIONS" />

      <div>
        <h2 className={styles.heading}>Start Delivery</h2>
        <p className={styles.subtitle}>
          Confirm that the vehicle has left the loading point.
        </p>
      </div>

      {state.error && <div className={styles.error}>{state.error}</div>}
      {state.success && <div className={styles.success}>{state.success}</div>}

      <div className={styles.field}>
        <label htmlFor="odometerBefore" className={styles.label}>
          Starting odometer
        </label>
        <input
          id="odometerBefore"
          name="odometerBefore"
          type="number"
          min="0"
          step="any"
          className={styles.input}
          placeholder="Enter current odometer"
        />
        {state.fieldErrors?.odometerBefore && (
          <p className={styles.fieldError}>
            {state.fieldErrors.odometerBefore}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className={styles.submitBtn}>
        {pending ? "Starting..." : "Start Delivery"}
      </button>
    </form>
  );
}