import Link from "next/link";
import { getQuoteRequests } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function QuoteRequestsPage() {
  const quoteRequests = await getQuoteRequests();

  return (
    <div className={styles.page}>
      <Link href="/commercial" className={styles.back}>
        ← Commercial Intake
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL</div>
          <h1 className={styles.title}>Quote Requests</h1>
          <p className={styles.subtitle}>
            Specific commercial requests received from leads.
          </p>
        </div>
      </header>

      <section className={styles.card}>
        {quoteRequests.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No quote requests yet</div>
            <p>Quote requests are created from an existing lead.</p>
            <Link href="/commercial/leads" className={styles.secondaryButton}>
              View Leads
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Quote Request</th>
                  <th>Lead</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Qualification</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {quoteRequests.map((qr) => (
                  <tr key={qr.id}>
                    <td>
                      <Link
                        href={`/commercial/quote-requests/${qr.id}`}
                        className={styles.rowLink}
                      >
                        <span className={styles.rowTitle}>{qr.referenceNumber}</span>
                      </Link>
                    </td>
                    <td>
                      <Link href={`/commercial/leads/${qr.lead.id}`} className={styles.leadLink}>
                        {qr.lead.companyName}
                      </Link>
                    </td>
                    <td>{qr.requestedProduct.replace("_", " ")}</td>
                    <td>
                      {qr.requestedQuantity
                        ? `${qr.requestedQuantity} ${qr.unit ?? ""}`
                        : "—"}
                    </td>
                    <td>
                      <span className={styles.badge} data-tone={qr.qualificationState}>
                        {qr.qualificationState}
                      </span>
                    </td>
                    <td>
                      <span className={styles.statusPill} data-status={qr.status}>
                        {qr.status}
                      </span>
                    </td>
                    <td className={styles.muted}>{formatDate(qr.createdAt)}</td>
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