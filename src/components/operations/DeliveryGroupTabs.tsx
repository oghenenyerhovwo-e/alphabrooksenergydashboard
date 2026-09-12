"use client";

import { useState } from "react";
import Link from "next/link";
import { GenerateNoteButton } from "./DeliveryActions";
import styles from "@/app/operations/page.module.css";

export interface OperationsDeliveryRow {
  id: string;
  deliveryNoteNumber: string;
  customer: string;
  deliveryAddress: string;
  product: string;
  quantityLoaded: number | null;
  unit: string;
  destination: string;
  status: string;
  createdAt: Date;
  driver: { name: string } | null;
  vehicle: { plateNumber: string } | null;
  preTripInspection: {
    inspectionStatus: "READY_TO_DEPART" | "NOT_READY_TO_DEPART";
  } | null;
}

interface DeliveryGroup {
  key: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  label: string;
  deliveries: OperationsDeliveryRow[];
}

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={styles.status} data-status={status}>
      {statusLabel(status)}
    </span>
  );
}

function InspectionBadge({
  status,
}: {
  status: "READY_TO_DEPART" | "NOT_READY_TO_DEPART" | undefined;
}) {
  if (!status) {
    return (
      <span className={styles.inspection} data-ready="false">
        Not completed
      </span>
    );
  }

  return (
    <span
      className={styles.inspection}
      data-ready={status === "READY_TO_DEPART"}
    >
      {status === "READY_TO_DEPART" ? "Ready" : "Not ready"}
    </span>
  );
}

/**
 * Renders the Pending / In Progress / Completed tabs on the Operations
 * dashboard. Grouping itself is decided upstream in page.tsx via
 * getDeliveryStatusGroup (src/lib/delivery/statusGroup.ts) — this
 * component only renders whatever three arrays it's handed.
 */
export function DeliveryGroupTabs({ groups }: { groups: DeliveryGroup[] }) {
  const [activeKey, setActiveKey] = useState<DeliveryGroup["key"]>(
    groups[0]?.key ?? "PENDING"
  );

  const activeGroup =
    groups.find((group) => group.key === activeKey) ?? groups[0];

  return (
    <div>
      <div className={styles.tabs}>
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setActiveKey(group.key)}
            className={styles.tab}
            data-active={group.key === activeGroup?.key}
          >
            {group.label}
            <span className={styles.tabCount}>{group.deliveries.length}</span>
          </button>
        ))}
      </div>

      {!activeGroup || activeGroup.deliveries.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>
            No {activeGroup?.label.toLowerCase() ?? ""} deliveries
          </div>

          <p>There are currently no deliveries in this stage.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>DN Number</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Driver</th>
                <th>Vehicle</th>
                <th>Destination</th>
                <th>Inspection</th>
                <th>Status</th>
                <th>Created</th>
                {activeGroup.key === "COMPLETED" && <th>Delivery Note</th>}
              </tr>
            </thead>

            <tbody>
              {activeGroup.deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td>
                    <Link
                      href={`/operations/deliveries/${delivery.id}`}
                      className={styles.dn}
                    >
                      {delivery.deliveryNoteNumber}
                    </Link>
                  </td>

                  <td>
                    <div className={styles.customer}>{delivery.customer}</div>
                    <div className={styles.address}>
                      {delivery.deliveryAddress}
                    </div>
                  </td>

                  <td>{delivery.product}</td>

                  <td>
                    {delivery.quantityLoaded ?? "—"} {delivery.unit}
                  </td>

                  <td>{delivery.driver?.name ?? "Unassigned"}</td>

                  <td>{delivery.vehicle?.plateNumber ?? "Unassigned"}</td>

                  <td>{delivery.destination}</td>

                  <td>
                    <InspectionBadge
                      status={delivery.preTripInspection?.inspectionStatus}
                    />
                  </td>

                  <td>
                    <StatusBadge status={delivery.status} />
                  </td>

                  <td>{formatDate(delivery.createdAt)}</td>

                  {activeGroup.key === "COMPLETED" && (
                    <td>
                      <GenerateNoteButton deliveryId={delivery.id} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}