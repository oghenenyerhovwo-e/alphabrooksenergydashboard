import Link from "next/link";
import { NewInternalOrderForm } from "@/components/commercial/NewInternalOrderForm";
import styles from "../../leads/new/page.module.css";

export default function NewInternalOrderPage() {
  return (
    <div className={styles.page}>
      <Link href="/commercial" className={styles.back}>
        ← Commercial
      </Link>

      <header className={styles.header}>
        <div className={styles.eyebrow}>COMMERCIAL</div>

        <h1 className={styles.title}>
          Create Internal Order
        </h1>

        <p className={styles.subtitle}>
          Record a customer purchase request as an internal
          Alpha Brooks Energy order.
        </p>
      </header>

      <section className={styles.card}>
        <NewInternalOrderForm />
      </section>
    </div>
  );
}