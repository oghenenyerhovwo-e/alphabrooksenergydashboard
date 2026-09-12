import Link from "next/link";

import {
  getDriversAndVehicles,
} from "@/lib/delivery/actions";

import { NewDeliveryForm } from "@/components/operations/NewDeliveryForm";

import styles from "./page.module.css";

export default async function NewDeliveryPage() {
  const {
    drivers,
    vehicles,
  } =
    await getDriversAndVehicles();

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
            OPERATIONS
          </div>

          <h1 className={styles.title}>
            Create New Delivery
          </h1>

          <p className={styles.subtitle}>
            Create a delivery note and optionally
            assign an active driver and vehicle.
          </p>
        </div>
      </header>

      <section className={styles.card}>
        <NewDeliveryForm
          drivers={drivers}
          vehicles={vehicles}
        />
      </section>
    </div>
  );
}