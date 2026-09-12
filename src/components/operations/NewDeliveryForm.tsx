"use client";

import { useActionState } from "react";
import { createDeliveryAction, type CreateDeliveryFormState } from "@/lib/delivery/actions";
import styles from "./NewDeliveryForm.module.css";

const PRODUCTS = ["CNG", "AGO", "PMS", "LPG_BULK", "LPG_CYLINDERS", "OTHER"] as const;
const UNITS = ["SCM", "KG", "MT", "LITRES", "OTHER"] as const;

interface DriverOption {
  id: string;
  name: string;
}
interface VehicleOption {
  id: string;
  plateNumber: string;
}

const initialState: CreateDeliveryFormState = {};

export function NewDeliveryForm({
  drivers,
  vehicles,
}: {
  drivers: DriverOption[];
  vehicles: VehicleOption[];
}) {
  const [state, formAction, isPending] = useActionState(createDeliveryAction, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.error && <div className={styles.formError}>{state.error}</div>}

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Customer</div>
        <div className={styles.grid}>
          <Field label="Customer name" error={state.fieldErrors?.customer}>
            <input name="customer" type="text" className={styles.input} />
          </Field>
          <Field label="Customer location" error={state.fieldErrors?.customerLocation}>
            <input name="customerLocation" type="text" className={styles.input} />
          </Field>
          <Field label="Delivery address" error={state.fieldErrors?.deliveryAddress} wide>
            <input name="deliveryAddress" type="text" className={styles.input} />
          </Field>
          <Field label="Contact email" error={state.fieldErrors?.contactEmail}>
            <input name="contactEmail" type="email" className={styles.input} />
          </Field>
          <Field label="Destination" error={state.fieldErrors?.destination}>
            <input name="destination" type="text" className={styles.input} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Product &amp; Quantity</div>
        <div className={styles.grid}>
          <Field label="Product" error={state.fieldErrors?.product}>
            <select name="product" className={styles.input} defaultValue="">
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
          <Field label="Unit" error={state.fieldErrors?.unit}>
            <select name="unit" className={styles.input} defaultValue="">
              <option value="" disabled>
                Select unit
              </option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quantity loaded" error={state.fieldErrors?.quantityLoaded}>
            <input name="quantityLoaded" type="number" step="any" min="0" className={styles.input} />
          </Field>
          <Field label="Loading point" error={state.fieldErrors?.loadingPoint}>
            <input name="loadingPoint" type="text" className={styles.input} />
          </Field>
          <Field label="Delivery point" error={state.fieldErrors?.deliveryPoint}>
            <input name="deliveryPoint" type="text" className={styles.input} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Assignment</div>
        <div className={styles.grid}>
          <Field label="Driver (optional)" error={state.fieldErrors?.driverId}>
            <select name="driverId" className={styles.input} defaultValue="">
              <option value="">Unassigned — save as draft</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vehicle (optional)" error={state.fieldErrors?.vehicleId}>
            <select name="vehicleId" className={styles.input} defaultValue="">
              <option value="">Not assigned</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Trailer number (optional)" error={state.fieldErrors?.trailerNumber}>
            <input name="trailerNumber" type="text" className={styles.input} />
          </Field>
          <Field label="Planned departure" error={state.fieldErrors?.departureAt}>
            <input name="departureAt" type="datetime-local" className={styles.input} />
          </Field>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionTitle}>Notes</div>
        <div className={styles.grid}>
          <Field label="Operational remarks (optional)" error={state.fieldErrors?.deliveryRemarks} wide>
            <textarea name="deliveryRemarks" rows={3} className={styles.textarea} />
          </Field>
          <Field label="Your name (for the audit log)" error={state.fieldErrors?.actorName}>
            <input name="actorName" type="text" className={styles.input} placeholder="Operations" />
          </Field>
        </div>
      </section>

      <div className={styles.actions}>
        <button type="submit" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Creating…" : "Create Delivery"}
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