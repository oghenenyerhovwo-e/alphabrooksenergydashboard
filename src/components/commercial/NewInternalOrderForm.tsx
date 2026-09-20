"use client";

import { useActionState } from "react";
import {
  createInternalOrderAction,
  type CommercialActionState,
} from "@/lib/commercial/actions";
import { ZohoCustomerSelect } from "@/components/commercial/ZohoCustomerSelect";
import styles from "./NewLeadForm.module.css";

const PRODUCTS = [
  "CNG",
  "AGO",
  "PMS",
  "LPG_BULK",
  "LPG_CYLINDERS",
  "OTHER",
] as const;

const initialState: CommercialActionState = {};

export function NewInternalOrderForm() {
  const [state, formAction, isPending] = useActionState(
    createInternalOrderAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form}>
      {state.error && (
        <div className={styles.formError}>{state.error}</div>
      )}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Customer</div>

        <div className={styles.grid}>
          <Field
            label="Customer"
            error={state.fieldErrors?.zohoCustomerId}
            wide
          >
            <ZohoCustomerSelect
              name="zohoCustomerId"
              required
              disabled={isPending}
            />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Order Details</div>

        <div className={styles.grid}>
          <Field
            label="Product"
            error={state.fieldErrors?.product}
          >
            <select
              name="product"
              className={styles.input}
              defaultValue=""
              required
              disabled={isPending}
            >
              <option value="" disabled>
                Select product
              </option>

              {PRODUCTS.map((product) => (
                <option key={product} value={product}>
                  {product.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Quantity"
            error={state.fieldErrors?.quantity}
          >
            <input
              name="quantity"
              type="number"
              min="0"
              step="any"
              className={styles.input}
              required
              disabled={isPending}
            />
          </Field>

          <Field
            label="Delivery location"
            error={state.fieldErrors?.deliveryLocation}
            wide
          >
            <input
              name="deliveryLocation"
              type="text"
              className={styles.input}
              required
              disabled={isPending}
            />
          </Field>

          <Field
            label="Customer request/reference (optional)"
            error={state.fieldErrors?.customerReference}
            wide
          >
            <input
              name="customerReference"
              type="text"
              className={styles.input}
              disabled={isPending}
            />
          </Field>

          <Field
            label="Notes (optional)"
            error={state.fieldErrors?.notes}
            wide
          >
            <textarea
              name="notes"
              rows={4}
              className={styles.textarea}
              disabled={isPending}
            />
          </Field>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={isPending}
          className={styles.submitBtn}
        >
          {isPending
            ? "Creating internal order…"
            : "Create Internal Order"}
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
    <label
      className={`${styles.field} ${wide ? styles.wide : ""}`}
    >
      <span className={styles.label}>{label}</span>

      {children}

      {error && (
        <span className={styles.fieldError}>{error}</span>
      )}
    </label>
  );
}