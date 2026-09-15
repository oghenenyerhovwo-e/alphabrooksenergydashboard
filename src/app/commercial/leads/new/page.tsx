import Link from "next/link";
import { NewLeadForm } from "@/components/commercial/NewLeadForm";
import styles from "./page.module.css";

export default function NewLeadPage() {
  return (
    <div className={styles.page}>
      <Link href="/commercial/leads" className={styles.back}>
        ← Leads
      </Link>

      <header className={styles.header}>
        <div className={styles.eyebrow}>COMMERCIAL</div>
        <h1 className={styles.title}>Capture New Lead</h1>
        <p className={styles.subtitle}>
          Record a new commercial opportunity before a Customer record exists.
        </p>
      </header>

      <section className={styles.card}>
        <NewLeadForm />
      </section>
    </div>
  );
}