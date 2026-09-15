"use client";

import { useActionState } from "react";
import { createLeadAction, type CommercialActionState } from "@/lib/commercial/actions";
import styles from "./NewLeadForm.module.css";

const SOURCES = [
  "WEBSITE",
  "REFERRAL",
  "SALES",
  "BUSINESS_DEVELOPMENT",
  "PHONE",
  "EMAIL",
  "WHATSAPP",
  "OTHER",
] as const;

const PRODUCTS = ["CNG", "AGO", "PMS", "LPG_BULK", "LPG_CYLINDERS", "OTHER"] as const;

const initialState: CommercialActionState = {};

export function NewLeadForm() {
  const [state, formAction, isPending] = useActionState(createLeadAction, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.error && <div className={styles.formError}>{state.error}</div>}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Prospect</div>
        <div className={styles.grid}>
          <Field label="Company / lead name" error={state.fieldErrors?.companyName} wide>
            <input name="companyName" type="text" className={styles.input} />
          </Field>
          <Field label="Contact person" error={state.fieldErrors?.contactPerson}>
            <input name="contactPerson" type="text" className={styles.input} />
          </Field>
          <Field label="Phone" error={state.fieldErrors?.phone}>
            <input name="phone" type="text" className={styles.input} />
          </Field>
          <Field label="Email" error={state.fieldErrors?.email}>
            <input name="email" type="email" className={styles.input} />
          </Field>
          <Field label="Location" error={state.fieldErrors?.location}>
            <input name="location" type="text" className={styles.input} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Source &amp; Interest</div>
        <div className={styles.grid}>
          <Field label="Lead source" error={state.fieldErrors?.source}>
            <select name="source" className={styles.input} defaultValue="">
              <option value="" disabled>
                Select source
              </option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Product interest (optional)" error={state.fieldErrors?.productInterest}>
            <select name="productInterest" className={styles.input} defaultValue="">
              <option value="">Not specified</option>
              {PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Notes</div>
        <div className={styles.grid}>
          <Field label="Notes (optional)" error={state.fieldErrors?.notes} wide>
            <textarea name="notes" rows={3} className={styles.textarea} />
          </Field>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Creating…" : "Create Lead"}
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