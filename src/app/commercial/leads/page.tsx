import Link from "next/link";
import { getLeads } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div className={styles.page}>
      <Link href="/commercial" className={styles.back}>
        ← Commercial Intake
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL</div>
          <h1 className={styles.title}>Leads</h1>
          <p className={styles.subtitle}>
            Commercial opportunities before a Customer record is established.
          </p>
        </div>

        <Link href="/commercial/leads/new" className={styles.primaryButton}>
          + New Lead
        </Link>
      </header>

      <section className={styles.card}>
        {leads.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No leads yet</div>
            <p>Create the first lead to begin the commercial pipeline.</p>
            <Link href="/commercial/leads/new" className={styles.secondaryButton}>
              Create Lead
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Product Interest</th>
                  <th>Qualification</th>
                  <th>Status</th>
                  <th>Quote Requests</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <Link href={`/commercial/leads/${lead.id}`} className={styles.rowLink}>
                        <span className={styles.rowTitle}>{lead.companyName}</span>
                        <span className={styles.rowSub}>{lead.referenceNumber}</span>
                      </Link>
                    </td>
                    <td>
                      <div className={styles.contactCell}>
                        <span>{lead.contactPerson ?? "—"}</span>
                        {lead.phone && <span className={styles.muted}>{lead.phone}</span>}
                      </div>
                    </td>
                    <td>{lead.source.replace("_", " ")}</td>
                    <td>{lead.productInterest ? lead.productInterest.replace("_", " ") : "—"}</td>
                    <td>
                      <span className={styles.badge} data-tone={lead.qualificationState}>
                        {lead.qualificationState}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statusPill} data-status={lead.status}>
                        {lead.status}
                      </span>
                    </td>
                    <td>{lead.quoteRequests.length}</td>
                    <td className={styles.muted}>{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}