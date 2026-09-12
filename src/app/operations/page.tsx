import Link from "next/link";
import {
  getOperationsDeliveries,
} from "@/lib/delivery/actions";
import { getDeliveryStatusGroup } from "@/lib/delivery/statusGroup";
import { DeliveryGroupTabs } from "@/components/operations/DeliveryGroupTabs";
import styles from "./page.module.css";

export default async function DeliveriesPage() {
  const deliveries =
    await getOperationsDeliveries();

  const total =
    deliveries.length;

  const assigned =
    deliveries.filter(
      (d) => d.status === "ASSIGNED"
    ).length;

  const dispatched =
    deliveries.filter(
      (d) => d.status === "DISPATCHED"
    ).length;

  const inTransit =
    deliveries.filter(
      (d) => d.status === "IN_TRANSIT"
    ).length;

  const completed =
    deliveries.filter(
      (d) =>
        d.status === "DELIVERED"
    ).length;

  const attention =
    deliveries.filter(
      (d) =>
        d.needsAttention ||
        d.hasIssue
    ).length;

  const pendingDeliveries = deliveries.filter(
    (d) => getDeliveryStatusGroup(d.status) === "PENDING"
  );

  const inProgressDeliveries = deliveries.filter(
    (d) => getDeliveryStatusGroup(d.status) === "IN_PROGRESS"
  );

  const completedDeliveries = deliveries.filter(
    (d) => getDeliveryStatusGroup(d.status) === "COMPLETED"
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>
            OPERATIONS
          </div>

          <h1 className={styles.title}>
            Delivery Management
          </h1>

          <p className={styles.subtitle}>
            Assign, dispatch and monitor
            operational deliveries.
          </p>
        </div>

        <Link
          href="/operations/deliveries/new"
          className={styles.primaryButton}
        >
          + New Delivery
        </Link>
      </header>

      <section className={styles.stats}>
        <Stat
          label="Total"
          value={total}
        />

        <Stat
          label="Assigned"
          value={assigned}
        />

        <Stat
          label="Dispatched"
          value={dispatched}
        />

        <Stat
          label="In Transit"
          value={inTransit}
        />

        <Stat
          label="Completed"
          value={completed}
        />

        <Stat
          label="Attention"
          value={attention}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>
              Deliveries
            </h2>

            <p className={styles.cardSubtitle}>
              Current operational delivery
              records.
            </p>
          </div>
        </div>

        {deliveries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>
              No deliveries yet
            </div>

            <p>
              Create the first delivery to
              begin the dispatch workflow.
            </p>

            <Link
              href="/operations/deliveries/new"
              className={styles.secondaryButton}
            >
              Create Delivery
            </Link>
          </div>
        ) : (
          <DeliveryGroupTabs
            groups={[
              {
                key: "PENDING",
                label: "Pending",
                deliveries: pendingDeliveries,
              },
              {
                key: "IN_PROGRESS",
                label: "In Progress",
                deliveries: inProgressDeliveries,
              },
              {
                key: "COMPLETED",
                label: "Completed",
                deliveries: completedDeliveries,
              },
            ]}
          />
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>
        {label}
      </div>

      <div className={styles.statValue}>
        {value}
      </div>
    </div>
  );
}