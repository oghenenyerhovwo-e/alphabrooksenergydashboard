"use client";

import { useActionState } from "react";
import {
  createQuoteRequestAction,
  type CommercialActionState,
} from "@/lib/commercial/actions";
import styles from "@/components/commercial/NewLeadForm.module.css";

const PRODUCTS = ["CNG", "AGO", "PMS", "LPG_BULK", "LPG_CYLINDERS", "OTHER"] as const;
const UNITS = ["SCM", "KG", "MT", "LITRES", "OTHER"] as const;

const initialState: CommercialActionState = {};

export function NewQuoteRequestForm({ leadId }: { leadId: string }) {
  const [state, formAction, isPending] = useActionState(
    createQuoteRequestAction,
    initialState
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="leadId" value={leadId} />

      {state.error && <div className={styles.formError}>{state.error}</div>}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Requested Product</div>
        <div className={styles.grid}>
          <Field label="Product" error={state.fieldErrors?.requestedProduct}>
            <select name="requestedProduct" className={styles.input} defaultValue="">
              <option value="" disabled>
                Select product
              </option>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity (optional)" error={state.fieldErrors?.requestedQuantity}>
            <input
              name="requestedQuantity"
              type="number"
              step="any"
              min="0"
              className={styles.input}
            />
          </Field>
          <Field label="Unit (optional)" error={state.fieldErrors?.unit}>
            <select name="unit" className={styles.input} defaultValue="">
              <option value="">Not specified</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Delivery</div>
        <div className={styles.grid}>
          <Field label="Delivery location (optional)" error={state.fieldErrors?.deliveryLocation}>
            <input name="deliveryLocation" type="text" className={styles.input} />
          </Field>
          <Field
            label="Requested delivery date (optional)"
            error={state.fieldErrors?.requestedDeliveryDate}
          >
            <input name="requestedDeliveryDate" type="datetime-local" className={styles.input} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Details</div>
        <div className={styles.grid}>
          <Field label="Description (optional)" error={state.fieldErrors?.description} wide>
            <textarea name="description" rows={3} className={styles.textarea} />
          </Field>
          <Field label="Notes (optional)" error={state.fieldErrors?.notes} wide>
            <textarea name="notes" rows={3} className={styles.textarea} />
          </Field>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Creating…" : "Create Quote Request"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  wide,
  children,
}: {
  label: string;
  error?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`${styles.field} ${wide ? styles.wide : ""}`}>
      <span className={styles.label}>{label}</span>
      {children}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
}