"use client";

import { useActionState } from "react";
import {
  sendDeliveryNoteAction,
  type SendNoteActionState,
} from "@/lib/delivery/actions";
import styles from "./DeliveryNoteActions.module.css";

const initialState: SendNoteActionState = {};

export function DeliveryNoteActions({
  deliveryId,
  contactEmail,
}: {
  deliveryId: string;
  contactEmail: string;
}) {
  const [state, formAction, isPending] = useActionState(
    sendDeliveryNoteAction,
    initialState
  );

  return (
    <div className={styles.actions}>
      <button
        type="button"
        onClick={() => window.print()}
        className={styles.printButton}
      >
        Print
      </button>

      <form action={formAction} className={styles.emailForm}>
        <input type="hidden" name="deliveryId" value={deliveryId} />

        <button
          type="submit"
          className={styles.emailButton}
          disabled={isPending}
        >
          {isPending ? "Sending…" : `Send to ${contactEmail}`}
        </button>
      </form>

      {state.error && <span className={styles.error}>{state.error}</span>}
      {state.success && <span className={styles.success}>{state.success}</span>}
    </div>
  );
}