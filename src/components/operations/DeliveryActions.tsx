"use client";

import {
  useActionState,
} from "react";

import {
  assignDeliveryAction,
  dispatchDeliveryAction,
  type DeliveryActionState,
} from "@/lib/delivery/actions";

import Link from "next/link";

import styles from "./DeliveryActions.module.css";

interface DriverOption {
  id: string;
  name: string;
  phone?: string | null;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
}

const initialState: DeliveryActionState =
  {};

export function AssignmentPanel({
  deliveryId,
  currentDriverId,
  currentVehicleId,
  drivers,
  vehicles,
}: {
  deliveryId: string;
  currentDriverId: string | null;
  currentVehicleId: string | null;
  drivers: DriverOption[];
  vehicles: VehicleOption[];
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    assignDeliveryAction,
    initialState
  );

  return (
    <section className={styles.panel}>
      <div>
        <div className={styles.eyebrow}>
          OPERATIONS ACTION
        </div>

        <h2 className={styles.title}>
          Assign Delivery
        </h2>

        <p className={styles.description}>
          Select an active driver and active
          vehicle. Assignment is validated again
          on the server.
        </p>
      </div>

      {state.error && (
        <div className={styles.error}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={styles.success}>
          Delivery assigned successfully.
        </div>
      )}

      <form
        action={formAction}
        className={styles.form}
      >
        <input
          type="hidden"
          name="deliveryId"
          value={deliveryId}
        />

        <div className={styles.field}>
          <label htmlFor="driverId">
            Driver
          </label>

          <select
            id="driverId"
            name="driverId"
            defaultValue={
              currentDriverId ?? ""
            }
            required
          >
            <option
              value=""
              disabled
            >
              Select active driver
            </option>

            {drivers.map(
              (driver) => (
                <option
                  key={driver.id}
                  value={driver.id}
                >
                  {driver.name}
                  {driver.phone
                    ? ` — ${driver.phone}`
                    : ""}
                </option>
              )
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="vehicleId">
            Vehicle
          </label>

          <select
            id="vehicleId"
            name="vehicleId"
            defaultValue={
              currentVehicleId ?? ""
            }
            required
          >
            <option
              value=""
              disabled
            >
              Select active vehicle
            </option>

            {vehicles.map(
              (vehicle) => (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                >
                  {vehicle.plateNumber}
                </option>
              )
            )}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="assignmentActor">
            Operations user
          </label>

          <input
            id="assignmentActor"
            name="actorName"
            type="text"
            placeholder="Operations"
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={isPending}
        >
          {isPending
            ? "Assigning…"
            : "Assign Delivery"}
        </button>
      </form>
    </section>
  );
}

export function DispatchPanel({
  deliveryId,
  inspectionStatus,
}: {
  deliveryId: string;
  inspectionStatus:
    | "READY_TO_DEPART"
    | "NOT_READY_TO_DEPART"
    | undefined;
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    dispatchDeliveryAction,
    initialState
  );

  const inspectionReady =
    inspectionStatus ===
    "READY_TO_DEPART";

  return (
    <section
      className={styles.dispatchPanel}
    >
      <div>
        <div className={styles.eyebrow}>
          DISPATCH CONTROL
        </div>

        <h2 className={styles.title}>
          Dispatch Delivery
        </h2>

        <p className={styles.description}>
          Dispatch can only proceed after a
          successful pre-trip inspection.
        </p>
      </div>

      <div
        className={styles.readiness}
        data-ready={inspectionReady}
      >
        <div
          className={
            styles.readinessTitle
          }
        >
          Vehicle Readiness
        </div>

        <div
          className={
            styles.readinessStatus
          }
        >
          {inspectionStatus ??
            "NOT COMPLETED"}
        </div>
      </div>

      {state.error && (
        <div className={styles.error}>
          {state.error}
        </div>
      )}

      {state.success && (
        <div className={styles.success}>
          Delivery dispatched successfully.
        </div>
      )}

      <form action={formAction}>
        <input
          type="hidden"
          name="deliveryId"
          value={deliveryId}
        />

        <div className={styles.field}>
          <label htmlFor="dispatchActor">
            Operations user
          </label>

          <input
            id="dispatchActor"
            name="actorName"
            type="text"
            placeholder="Operations"
          />
        </div>

        <button
          type="submit"
          className={
            styles.dispatchButton
          }
          disabled={
            isPending ||
            !inspectionReady
          }
        >
          {isPending
            ? "Dispatching…"
            : inspectionReady
            ? "Dispatch Delivery"
            : "Dispatch Blocked — Inspection Required"}
        </button>
      </form>
    </section>
  );
}

export function GenerateNoteButton({
  deliveryId,
}: {
  deliveryId: string;
}) {
  return (
    <Link
      href={`/operations/deliveries/${deliveryId}/note`}
      className={styles.noteButton}
    >
      Generate Delivery Note
    </Link>
  );
}