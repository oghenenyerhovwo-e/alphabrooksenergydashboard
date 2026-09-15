import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/commercial/actions";
import { EditLeadForm } from "@/components/commercial/EditLeadForm";
import styles from "../../new/page.module.css";

interface EditLeadPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLeadPage({ params }: EditLeadPageProps) {
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
        <h1 className={styles.title}>Edit Lead</h1>
        <p className={styles.subtitle}>{lead.referenceNumber}</p>
      </header>

      <section className={styles.card}>
        <EditLeadForm lead={lead} />
      </section>
    </div>
  );
}