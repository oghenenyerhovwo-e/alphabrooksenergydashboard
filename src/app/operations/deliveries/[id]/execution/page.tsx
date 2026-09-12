import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getDeliveryForExecution,
} from "@/lib/delivery/execution-actions";

import {
  DeliveryExecutionForm,
} from "@/components/delivery/DeliveryExecutionForm";

import {
  StartDeliveryForm,
} from "@/components/operations/StartDeliveryForm";
import {
  DeliveryIssueForms,
} from "@/components/delivery/DeliveryIssueForms";
import {
  PreTripInspectionForm,
} from "@/components/operations/PreTripInspectionForm";

import styles from "./page.module.css";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function statusLabel(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

export default async function DeliveryExecutionPage({
  params,
}: PageProps) {
  const { id } = await params;

  const delivery =
    await getDeliveryForExecution(id);

  if (!delivery) {
    notFound();
  }

  const inspectionReady =
    delivery.preTripInspection
      ?.inspectionStatus ===
    "READY_TO_DEPART";

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <Link
            href={`/operations/deliveries/${delivery.id}`}
            className={styles.back}
          >
            ← Back to Delivery
          </Link>

          <h1 className={styles.title}>
            Delivery Execution
          </h1>

          <p className={styles.subtitle}>
            {delivery.deliveryNoteNumber}
          </p>
        </div>

        <div className={styles.status}>
          {statusLabel(delivery.status)}
        </div>
      </div>

      <section className={styles.grid}>
        <InfoCard
          label="Customer"
          value={delivery.customer}
        />

        <InfoCard
          label="Product"
          value={delivery.product}
        />

        <InfoCard
          label="Loaded Quantity"
          value={
            delivery.quantityLoaded !== null
              ? `${delivery.quantityLoaded} ${delivery.unit}`
              : "Not recorded"
          }
        />

        <InfoCard
          label="Driver"
          value={
            delivery.driver?.name ??
            "Not assigned"
          }
        />

        <InfoCard
          label="Vehicle"
          value={
            delivery.vehicle?.plateNumber ??
            "Not assigned"
          }
        />

        <InfoCard
          label="Destination"
          value={delivery.destination}
        />
      </section>

      {delivery.status ===
        "DISPATCHED" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              Departure Readiness
            </h2>

            <p className={styles.panelSubtitle}>
              The delivery must have a completed
              pre-trip inspection before it can
              enter transit.
            </p>
          </div>

          <div className={styles.readinessBox}>
            <div className={styles.readinessRow}>
              <span className={styles.readinessLabel}>
                Pre-trip inspection
              </span>

              <strong
                className={
                  inspectionReady
                    ? styles.readinessOk
                    : styles.readinessBad
                }
              >
                {delivery.preTripInspection
                  ? statusLabel(
                      delivery
                        .preTripInspection
                        .inspectionStatus
                    )
                  : "NOT COMPLETED"}
              </strong>
            </div>
          </div>

          {inspectionReady ? (
            <StartDeliveryForm
              deliveryId={delivery.id}
            />
          ) : (
            <div className={styles.blockedNotice}>
              This vehicle has not been cleared
              for departure.
            </div>
          )}
        </section>
      )}

      {delivery.status ===
        "IN_TRANSIT" && (
        <>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                Journey Information
              </h2>
            </div>

            <div className={styles.gridThree}>
              <InfoCard
                label="Departure"
                value={
                  delivery.departureAt
                    ? delivery.departureAt.toLocaleString()
                    : "Not recorded"
                }
              />

              <InfoCard
                label="Starting Odometer"
                value={
                  delivery.odometerBefore ??
                  "Not recorded"
                }
              />

              <InfoCard
                label="Current Status"
                value="IN TRANSIT"
              />
            </div>
          </section>

          <DeliveryExecutionForm
            deliveryId={delivery.id}
            quantityLoaded={
              delivery.quantityLoaded ?? 0
            }
            odometerBefore={
              delivery.odometerBefore
            }
            driverName={
              delivery.driver?.name ?? null
            }
          />

          <DeliveryIssueForms
            deliveryId={delivery.id}
          />
        </>
      )}

      {[
        "DELIVERED",
        "PARTIALLY_DELIVERED",
        "REJECTED",
        "FAILED",
      ].includes(delivery.status) && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>
            Delivery Completed
          </h2>

          <div className={styles.gridThreeSpaced}>
            <InfoCard
              label="Final Status"
              value={statusLabel(
                delivery.status
              )}
            />

            <InfoCard
              label="Delivered"
              value={
                delivery.quantityDelivered ??
                "Not recorded"
              }
            />

            <InfoCard
              label="Returned"
              value={
                delivery.quantityReturned ??
                "0"
              }
            />

            <InfoCard
              label="Receiver"
              value={
                delivery.receiverName ??
                "Not recorded"
              }
            />

            <InfoCard
              label="Receiver Phone"
              value={
                delivery.receiverPhone ??
                "Not recorded"
              }
            />

            <InfoCard
              label="Distance Travelled"
              value={
                delivery.distanceTravelled ??
                "Not recorded"
              }
            />
          </div>

          {delivery.deliveryRemarks && (
            <div className={styles.noteBox}>
              <p className={styles.noteLabel}>
                Remarks
              </p>

              <p className={styles.noteBody}>
                {delivery.deliveryRemarks}
              </p>
            </div>
          )}

          {delivery.issueDescription && (
            <div className={styles.issueBox}>
              <p className={styles.issueLabel}>
                Issue
              </p>

              <p className={styles.issueBody}>
                {delivery.issueDescription}
              </p>
            </div>
          )}
        </section>
      )}

                  {delivery.status === "ASSIGNED" && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>
              Pre-Trip Inspection
            </h2>
            <p className={styles.panelSubtitle}>
              File the vehicle checklist to clear this delivery for dispatch.
            </p>
          </div>

          {delivery.preTripInspection?.inspectionStatus === "READY_TO_DEPART" ? (
            <div className={styles.readinessBox}>
              <div className={styles.readinessRow}>
                <span className={styles.readinessLabel}>
                  Inspection complete — vehicle cleared for departure.
                </span>
                <strong className={styles.readinessOk}>READY_TO_DEPART</strong>
              </div>
              <p className={styles.panelSubtitle} style={{ marginTop: 12 }}>
                Go to the{" "}
                <Link href={`/operations/deliveries/${delivery.id}`}>
                  delivery page
                </Link>{" "}
                and click <strong>Dispatch Delivery</strong> to continue.
              </p>
            </div>
          ) : (
            <PreTripInspectionForm
              deliveryId={delivery.id}
              defaultDriverName={delivery.driver?.name}
              defaultVehicleNumber={delivery.vehicle?.plateNumber}
            />
          )}
        </section>
      )}

      <AuditHistory
        logs={delivery.auditLogs}
      />
    </main>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>
        {label}
      </p>

      <p className={styles.cardValue}>
        {String(value)}
      </p>
    </div>
  );
}

function AuditHistory({
  logs,
}: {
  logs: Array<{
    id: string;
    actorName: string;
    actorRole: string;
    action: string;
    details: string | null;
    createdAt: Date;
  }>;
}) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.panelTitle}>
        Audit History
      </h2>

      <div className={styles.timeline}>
        {logs.length === 0 ? (
          <p className={styles.muted}>
            No audit events recorded.
          </p>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={styles.timelineItem}
            >
              <div className={styles.timelineMetaRow}>
                <strong className={styles.timelineAction}>
                  {statusLabel(log.action)}
                </strong>

                <span className={styles.timelineActor}>
                  {log.actorName}
                </span>

                <span className={styles.timelineDate}>
                  {log.createdAt.toLocaleString()}
                </span>
              </div>

              {log.details && (
                <p className={styles.timelineDetails}>
                  {log.details}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}