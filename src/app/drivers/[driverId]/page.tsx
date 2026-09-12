import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeliveryStatus } from "@/generated/prisma/client";
import styles from "./page.module.css";

function statusLabel(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DriverDeliveriesPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
  });

  if (!driver) {
    notFound();
  }

  const deliveries = await prisma.delivery.findMany({
    where: {
      driverId,
      status: {
        in: [
          DeliveryStatus.ASSIGNED,
          DeliveryStatus.DISPATCHED,
          DeliveryStatus.IN_TRANSIT,
        ],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className={styles.page}>
      <Link href="/drivers" className={styles.back}>
        ← Driver Activity
      </Link>

      <header className={styles.header}>
        <div className={styles.eyebrow}>DRIVER</div>
        <h1 className={styles.title}>{driver.name}</h1>
        <p className={styles.subtitle}>
          Deliveries assigned to you that are not yet completed.
        </p>
      </header>

      {deliveries.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>
            No deliveries assigned right now
          </div>
          <p>Check back once Operations assigns you a delivery.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {deliveries.map((delivery) => (
            <li key={delivery.id} className={styles.row}>
              <Link
                href={`/operations/deliveries/${delivery.id}/execution`}
                className={styles.rowLink}
              >
                <div className={styles.rowTop}>
                  <span className={styles.dn}>
                    {delivery.deliveryNoteNumber}
                  </span>
                  <span
                    className={styles.status}
                    data-status={delivery.status}
                  >
                    {statusLabel(delivery.status)}
                  </span>
                </div>

                <div className={styles.rowBottom}>
                  <span className={styles.customer}>
                    {delivery.customer}
                  </span>
                  <span className={styles.destination}>
                    → {delivery.destination}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}