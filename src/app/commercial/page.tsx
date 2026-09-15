import Link from "next/link";
import { getCommercialDashboardData } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function CommercialDashboardPage() {
  const data = await getCommercialDashboardData();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL</div>
          <h1 className={styles.title}>Commercial Intake</h1>
          <p className={styles.subtitle}>
            Leads, quote requests, and qualification pipeline.
          </p>
        </div>

        <Link href="/commercial/leads/new" className={styles.primaryButton}>
          + New Lead
        </Link>
      </header>

      <section className={styles.stats}>
        <Stat label="Total Leads" value={data.totalLeads} />
        <Stat label="Pending" value={data.pendingLeads} />
        <Stat label="Qualified" value={data.qualifiedLeads} />
        <Stat label="Disqualified" value={data.disqualifiedLeads} />
        <Stat label="Open Quote Requests" value={data.openQuoteRequests} />
      </section>

      <div className={styles.columns}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Recent Leads</h2>
              <p className={styles.cardSubtitle}>Latest commercial opportunities.</p>
            </div>
            <Link href="/commercial/leads" className={styles.secondaryButton}>
              View all
            </Link>
          </div>

          {data.recentLeads.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No leads yet</div>
              <p>Capture your first commercial lead to begin the pipeline.</p>
              <Link href="/commercial/leads/new" className={styles.secondaryButton}>
                Create Lead
              </Link>
            </div>
          ) : (
            <ul className={styles.list}>
              {data.recentLeads.map((lead) => (
                <li key={lead.id} className={styles.listItem}>
                  <Link href={`/commercial/leads/${lead.id}`} className={styles.listLink}>
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>{lead.companyName}</span>
                      <span className={styles.listSub}>{lead.referenceNumber}</span>
                    </div>
                    <div className={styles.listMeta}>
                      <span
                        className={styles.badge}
                        data-tone={lead.qualificationState}
                      >
                        {lead.qualificationState}
                      </span>
                      <span className={styles.listDate}>{formatDate(lead.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Recent Quote Requests</h2>
              <p className={styles.cardSubtitle}>Latest requested commercial products.</p>
            </div>
            <Link href="/commercial/quote-requests" className={styles.secondaryButton}>
              View all
            </Link>
          </div>

          {data.recentQuoteRequests.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No quote requests yet</div>
              <p>Quote requests will appear here once created from a lead.</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {data.recentQuoteRequests.map((qr) => (
                <li key={qr.id} className={styles.listItem}>
                  <Link
                    href={`/commercial/quote-requests/${qr.id}`}
                    className={styles.listLink}
                  >
                    <div className={styles.listMain}>
                      <span className={styles.listTitle}>{qr.lead.companyName}</span>
                      <span className={styles.listSub}>{qr.referenceNumber}</span>
                    </div>
                    <div className={styles.listMeta}>
                      <span className={styles.badge} data-tone={qr.qualificationState}>
                        {qr.qualificationState}
                      </span>
                      <span className={styles.listDate}>{formatDate(qr.createdAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}