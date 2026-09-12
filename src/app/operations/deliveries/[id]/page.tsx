import Link from "next/link";
import {
  getDeliveryDetail,
  getDriversAndVehicles,
} from "@/lib/delivery/actions";
import { getDeliveryStatusGroup } from "@/lib/delivery/statusGroup";
import { notFound } from "next/navigation";
import {
  AssignmentPanel,
  DispatchPanel,
  GenerateNoteButton,
} from "@/components/operations/DeliveryActions";
import styles from "./page.module.css";

interface DeliveryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

function statusLabel(
  status: string
) {
  return status
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatDate(
  value: Date | null
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(value);
}

export default async function DeliveryDetailPage({
  params,
}: DeliveryDetailPageProps) {
  const { id } = await params;

  const [
    delivery,
    options,
  ] = await Promise.all([
    getDeliveryDetail(id),
    getDriversAndVehicles(),
  ]);

  if (!delivery) {
    notFound();
  }

  const canAssign =
    delivery.status === "DRAFT" ||
    delivery.status === "ASSIGNED";

  const canDispatch =
    delivery.status === "ASSIGNED";

    const isCompleted = getDeliveryStatusGroup(delivery.status) === "COMPLETED";

  return (
    <div className={styles.page}>
      <Link
        href="/operations/deliveries"
        className={styles.back}
      >
        ← Delivery Management
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            DELIVERY NOTE
          </div>

          <h1 className={styles.dn}>
            {delivery.deliveryNoteNumber}
          </h1>

          <p className={styles.subtitle}>
            Created{" "}
            {formatDate(
              delivery.createdAt
            )}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            className={styles.status}
            data-status={delivery.status}
          >
            {statusLabel(delivery.status)}
          </span>

          {isCompleted && (
            <GenerateNoteButton deliveryId={delivery.id} />
          )}
        </div>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Customer
          </h2>

          <Detail
            label="Customer"
            value={delivery.customer}
          />

          <Detail
            label="Customer location"
            value={
              delivery.customerLocation
            }
          />

          <Detail
            label="Delivery address"
            value={
              delivery.deliveryAddress
            }
          />

          <Detail
            label="Destination"
            value={
              delivery.destination
            }
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Product & Quantity
          </h2>

          <Detail
            label="Product"
            value={delivery.product}
          />

          <Detail
            label="Quantity loaded"
            value={
              delivery.quantityLoaded !==
              null
                ? `${delivery.quantityLoaded} ${delivery.unit}`
                : "—"
            }
          />

          <Detail
            label="Quantity delivered"
            value={
              delivery.quantityDelivered !==
              null
                ? `${delivery.quantityDelivered} ${delivery.unit}`
                : "—"
            }
          />

          <Detail
            label="Quantity returned"
            value={
              delivery.quantityReturned !==
              null
                ? `${delivery.quantityReturned} ${delivery.unit}`
                : "—"
            }
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Assignment
          </h2>

          <Detail
            label="Driver"
            value={
              delivery.driver?.name ??
              "Unassigned"
            }
          />

          <Detail
            label="Driver phone"
            value={
              delivery.driver?.phone
            }
          />

          <Detail
            label="Vehicle"
            value={
              delivery.vehicle
                ?.plateNumber ??
              "Unassigned"
            }
          />

          <Detail
            label="Trailer"
            value={
              delivery.trailerNumber
            }
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Pre-Trip Inspection
          </h2>

          <Detail
            label="Status"
            value={
              delivery.preTripInspection
                ?.inspectionStatus ??
              "NOT COMPLETED"
            }
          />

          <Detail
            label="Inspection date"
            value={
              formatDate(
                delivery
                  .preTripInspection
                  ?.inspectionDate ??
                  null
              )
            }
          />

          <Detail
            label="Odometer"
            value={
              delivery
                .preTripInspection
                ?.odometerReading !==
              undefined
                ? String(
                    delivery
                      .preTripInspection
                      ?.odometerReading
                  )
                : "—"
            }
          />

          <Detail
            label="Defect"
            value={
              delivery.preTripInspection
                ?.hasDefect
                ? delivery
                    .preTripInspection
                    .defectDescription ??
                  "Defect reported"
                : "None reported"
            }
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Journey
          </h2>

          <Detail
            label="Loading point"
            value={
              delivery.loadingPoint
            }
          />

          <Detail
            label="Departure"
            value={formatDate(
              delivery.departureAt
            )}
          />

          <Detail
            label="Arrival"
            value={formatDate(
              delivery.arrivalAt
            )}
          />

          <Detail
            label="Route"
            value={
              delivery.routeTaken
            }
          />

          <Detail
            label="Distance"
            value={
              delivery.distanceTravelled !==
              null
                ? `${delivery.distanceTravelled} km`
                : "—"
            }
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            Delivery Confirmation
          </h2>

          <Detail
            label="Receiver"
            value={
              delivery.receiverName
            }
          />

          <Detail
            label="Receiver phone"
            value={
              delivery.receiverPhone
            }
          />

          <Detail
            label="Delivery remarks"
            value={
              delivery.deliveryRemarks
            }
          />

          <Detail
            label="Issue"
            value={
              delivery.hasIssue
                ? delivery.issueDescription ??
                  "Issue reported"
                : "No issue reported"
            }
          />
        </section>
      </div>

      {canAssign && (
        <AssignmentPanel
          deliveryId={delivery.id}
          currentDriverId={
            delivery.driverId
          }
          currentVehicleId={
            delivery.vehicleId
          }
          drivers={options.drivers}
          vehicles={options.vehicles}
        />
      )}

      {canDispatch && (
        <DispatchPanel
          deliveryId={delivery.id}
          inspectionStatus={
            delivery
              .preTripInspection
              ?.inspectionStatus
          }
        />
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          Audit History
        </h2>

        {delivery.auditLogs.length ===
        0 ? (
          <p className={styles.muted}>
            No audit events recorded.
          </p>
        ) : (
          <div
            className={styles.timeline}
          >
            {delivery.auditLogs.map(
              (log) => (
                <div
                  key={log.id}
                  className={
                    styles.timelineItem
                  }
                >
                  <div
                    className={
                      styles.timelineAction
                    }
                  >
                    {log.action}
                  </div>

                  <div
                    className={
                      styles.timelineDetails
                    }
                  >
                    {log.details ??
                      "No additional details."}
                  </div>

                  <div
                    className={
                      styles.timelineMeta
                    }
                  >
                    {log.actorName} ·{" "}
                    {log.actorRole} ·{" "}
                    {formatDate(
                      log.createdAt
                    )}
                  </div>
                </div>
              )
            )}

            <Link
                href={`/operations/deliveries/${delivery.id}/execution`}
                className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
                >
                Delivery Execution
                </Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLabel}>
        {label}
      </div>

      <div className={styles.detailValue}>
        {value || "—"}
      </div>
    </div>
  );
}