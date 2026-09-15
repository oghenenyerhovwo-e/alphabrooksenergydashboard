import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/commercial/actions";
import { NewQuoteRequestForm } from "@/components/commercial/NewQuoteRequestForm";
import styles from "../../../new/page.module.css";

interface NewQuoteRequestPageProps {
  params: Promise<{ id: string }>;
}

export default async function NewQuoteRequestPage({ params }: NewQuoteRequestPageProps) {
  const { id } = await params;
  const lead = await getLeadDetail(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Link href={`/commercial/leads/${lead.id}`} className={styles.back}>
        ← {lead.companyName}
      </Link>

      <header className={styles.header}>
        <div className={styles.eyebrow}>COMMERCIAL</div>
        <h1 className={styles.title}>New Quote Request</h1>
        <p className={styles.subtitle}>For lead {lead.referenceNumber}</p>
      </header>

      <section className={styles.card}>
        <NewQuoteRequestForm leadId={lead.id} />
      </section>
    </div>
  );
}