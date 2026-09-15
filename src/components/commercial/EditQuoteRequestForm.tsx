"use client";

import { useActionState } from "react";
import {
  updateQuoteRequestAction,
  type CommercialActionState,
} from "@/lib/commercial/actions";
import styles from "@/components/commercial/NewLeadForm.module.css";

const PRODUCTS = ["CNG", "AGO", "PMS", "LPG_BULK", "LPG_CYLINDERS", "OTHER"] as const;
const UNITS = ["SCM", "KG", "MT", "LITRES", "OTHER"] as const;

const initialState: CommercialActionState = {};

function toDatetimeLocalValue(value: Date | null): string {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}`;
}

interface EditQuoteRequestFormProps {
  quoteRequest: {
    id: string;
    requestedProduct: string;
    requestedQuantity: number | null;
    unit: string | null;
    deliveryLocation: string | null;
    requestedDeliveryDate: Date | null;
    description: string | null;
    notes: string | null;
  };
}

export function EditQuoteRequestForm({ quoteRequest }: EditQuoteRequestFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateQuoteRequestAction,
    initialState
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="quoteRequestId" value={quoteRequest.id} />

      {state.error && <div className={styles.formError}>{state.error}</div>}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Requested Product</div>
        <div className={styles.grid}>
          <Field label="Product" error={state.fieldErrors?.requestedProduct}>
            <select
              name="requestedProduct"
              className={styles.input}
              defaultValue={quoteRequest.requestedProduct}
            >
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
              defaultValue={quoteRequest.requestedQuantity ?? ""}
              className={styles.input}
            />
          </Field>
          <Field label="Unit (optional)" error={state.fieldErrors?.unit}>
            <select name="unit" className={styles.input} defaultValue={quoteRequest.unit ?? ""}>
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
            <input
              name="deliveryLocation"
              type="text"
              defaultValue={quoteRequest.deliveryLocation ?? ""}
              className={styles.input}
            />
          </Field>
          <Field
            label="Requested delivery date (optional)"
            error={state.fieldErrors?.requestedDeliveryDate}
          >
            <input
              name="requestedDeliveryDate"
              type="datetime-local"
              defaultValue={toDatetimeLocalValue(quoteRequest.requestedDeliveryDate)}
              className={styles.input}
            />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Details</div>
        <div className={styles.grid}>
          <Field label="Description (optional)" error={state.fieldErrors?.description} wide>
            <textarea
              name="description"
              rows={3}
              defaultValue={quoteRequest.description ?? ""}
              className={styles.textarea}
            />
          </Field>
          <Field label="Notes (optional)" error={state.fieldErrors?.notes} wide>
            <textarea
              name="notes"
              rows={3}
              defaultValue={quoteRequest.notes ?? ""}
              className={styles.textarea}
            />
          </Field>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Saving…" : "Save Changes"}
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