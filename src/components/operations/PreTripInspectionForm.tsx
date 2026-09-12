"use client";

import { useActionState } from "react";
import {
  submitPreTripInspectionAction,
  type DeliveryActionState,
} from "@/lib/delivery/execution-actions";
import styles from "./PreTripInspectionForm.module.css";

interface PreTripInspectionFormProps {
  deliveryId: string;
  defaultDriverName?: string | null;
  defaultVehicleNumber?: string | null;
}

const initialState: DeliveryActionState = {};

const CHECKLIST_ITEMS: { name: string; label: string }[] = [
  { name: "tyresSatisfactory", label: "Tyres" },
  { name: "brakesSatisfactory", label: "Brakes" },
  { name: "lightsSatisfactory", label: "Lights" },
  { name: "hornSatisfactory", label: "Horn" },
  { name: "mirrorsSatisfactory", label: "Mirrors" },
  { name: "vehicleBodySatisfactory", label: "Vehicle body" },
  { name: "fireExtinguisherSatisfactory", label: "Fire extinguisher" },
  { name: "firstAidKitSatisfactory", label: "First aid kit" },
  { name: "emergencyEquipmentSatisfactory", label: "Emergency equipment" },
  { name: "vehicleDocumentsSatisfactory", label: "Vehicle documents" },
];

export function PreTripInspectionForm({
  deliveryId,
  defaultDriverName,
  defaultVehicleNumber,
}: PreTripInspectionFormProps) {
  const [state, formAction, pending] = useActionState(
    submitPreTripInspectionAction,
    initialState
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <input type="hidden" name="actorName" value="Operations" />
      <input type="hidden" name="actorRole" value="OPERATIONS" />

      <div>
        <h2 className={styles.heading}>Pre-Trip Vehicle Inspection</h2>
        <p className={styles.subtitle}>
          Required before this delivery can be dispatched.
        </p>
      </div>

      {state.error && <div className={styles.error}>{state.error}</div>}
      {state.success && <div className={styles.success}>{state.success}</div>}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="driverName" className={styles.label}>Driver name</label>
          <input
            id="driverName"
            name="driverName"
            type="text"
            defaultValue={defaultDriverName ?? ""}
            className={styles.input}
          />
          {state.fieldErrors?.driverName && (
            <p className={styles.fieldError}>{state.fieldErrors.driverName}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="vehicleNumber" className={styles.label}>Vehicle number</label>
          <input
            id="vehicleNumber"
            name="vehicleNumber"
            type="text"
            defaultValue={defaultVehicleNumber ?? ""}
            className={styles.input}
          />
          {state.fieldErrors?.vehicleNumber && (
            <p className={styles.fieldError}>{state.fieldErrors.vehicleNumber}</p>
          )}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="inspectionDate" className={styles.label}>Inspection date/time</label>
          <input
            id="inspectionDate"
            name="inspectionDate"
            type="datetime-local"
            className={styles.input}
          />
          {state.fieldErrors?.inspectionDate && (
            <p className={styles.fieldError}>{state.fieldErrors.inspectionDate}</p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="odometerReading" className={styles.label}>Odometer reading</label>
          <input
            id="odometerReading"
            name="odometerReading"
            type="number"
            min="0"
            step="any"
            className={styles.input}
          />
          {state.fieldErrors?.odometerReading && (
            <p className={styles.fieldError}>{state.fieldErrors.odometerReading}</p>
          )}
        </div>
      </div>

      <div className={styles.checklist}>
        {CHECKLIST_ITEMS.map((item) => (
          <label key={item.name} className={styles.checkItem}>
            <input type="checkbox" name={item.name} />
            {item.label}
          </label>
        ))}
      </div>

      <div className={styles.field}>
        <label className={styles.checkItem}>
          <input type="checkbox" name="hasDefect" />
          Defect found
        </label>
      </div>

      <div className={styles.field}>
        <label htmlFor="defectDescription" className={styles.label}>Defect description (if any)</label>
        <textarea
          id="defectDescription"
          name="defectDescription"
          className={styles.textarea}
          rows={3}
        />
        {state.fieldErrors?.defectDescription && (
          <p className={styles.fieldError}>{state.fieldErrors.defectDescription}</p>
        )}
      </div>

      <div className={styles.field}>
        <label htmlFor="defectPhotoUrl" className={styles.label}>Defect photo URL (optional)</label>
        <input
          id="defectPhotoUrl"
          name="defectPhotoUrl"
          type="text"
          className={styles.input}
        />
        {state.fieldErrors?.defectPhotoUrl && (
          <p className={styles.fieldError}>{state.fieldErrors.defectPhotoUrl}</p>
        )}
      </div>

      <button type="submit" disabled={pending} className={styles.submitBtn}>
        {pending ? "Saving..." : "Submit Inspection"}
      </button>
    </form>
  );
}