import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeadDetail } from "@/lib/commercial/actions";
import { LeadQualificationPanel } from "@/components/commercial/LeadQualificationPanel";
import styles from "./page.module.css";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params;
  const lead = await getLeadDetail(id);

  if (!lead) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Link href="/commercial/leads" className={styles.back}>
        ← Leads
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>LEAD</div>
          <h1 className={styles.title}>{lead.companyName}</h1>
          <p className={styles.subtitle}>
            {lead.referenceNumber} · Created {formatDate(lead.createdAt)}
          </p>
        </div>

        <div className={styles.headerBadges}>
          <span className={styles.badge} data-tone={lead.qualificationState}>
            {lead.qualificationState}
          </span>
          <span className={styles.statusPill} data-status={lead.status}>
            {lead.status}
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Lead Information</h2>
              <Link href={`/commercial/leads/${lead.id}/edit`} className={styles.editLink}>
                Edit
              </Link>
            </div>

            <div className={styles.detailGrid}>
              <Detail label="Contact person" value={lead.contactPerson ?? "—"} />
              <Detail label="Phone" value={lead.phone ?? "—"} />
              <Detail label="Email" value={lead.email ?? "—"} />
              <Detail label="Location" value={lead.location ?? "—"} />
              <Detail label="Source" value={lead.source.replace("_", " ")} />
              <Detail
                label="Product interest"
                value={lead.productInterest ? lead.productInterest.replace("_", " ") : "—"}
              />
              <Detail label="Created by" value={lead.createdBy.name} />
              <Detail
                label="Qualified by"
                value={lead.qualifiedBy ? lead.qualifiedBy.name : "—"}
              />
            </div>

            {lead.notes && (
              <div className={styles.notesBlock}>
                <div className={styles.detailLabel}>Notes</div>
                <p className={styles.notesText}>{lead.notes}</p>
              </div>
            )}

            {lead.qualificationReason && (
              <div className={styles.notesBlock}>
                <div className={styles.detailLabel}>Qualification reason</div>
                <p className={styles.notesText}>{lead.qualificationReason}</p>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Quote Requests</h2>
              <Link
                href={`/commercial/leads/${lead.id}/quote-requests/new`}
                className={styles.secondaryButton}
              >
                + New Quote Request
              </Link>
            </div>

            {lead.quoteRequests.length === 0 ? (
              <p className={styles.muted}>No quote requests yet for this lead.</p>
            ) : (
              <ul className={styles.qrList}>
                {lead.quoteRequests.map((qr) => (
                  <li key={qr.id} className={styles.qrItem}>
                    <Link
                      href={`/commercial/quote-requests/${qr.id}`}
                      className={styles.qrLink}
                    >
                      <div className={styles.qrMain}>
                        <span className={styles.qrTitle}>{qr.referenceNumber}</span>
                        <span className={styles.qrSub}>
                          {qr.requestedProduct.replace("_", " ")}
                          {qr.requestedQuantity ? ` · ${qr.requestedQuantity} ${qr.unit ?? ""}` : ""}
                        </span>
                      </div>
                      <div className={styles.qrMeta}>
                        <span className={styles.badge} data-tone={qr.qualificationState}>
                          {qr.qualificationState}
                        </span>
                        <span className={styles.statusPill} data-status={qr.status}>
                          {qr.status}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Audit History</h2>

            {lead.auditLogs.length === 0 ? (
              <p className={styles.muted}>No audit events recorded.</p>
            ) : (
              <div className={styles.timeline}>
                {lead.auditLogs.map((log) => (
                  <div key={log.id} className={styles.timelineItem}>
                    <div className={styles.timelineAction}>{log.action}</div>
                    <div className={styles.timelineDetails}>
                      {log.details ?? "No additional details."}
                    </div>
                    <div className={styles.timelineMeta}>
                      {log.actorName} · {log.actorRole} · {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.sideColumn}>
          <LeadQualificationPanel leadId={lead.id} qualificationState={lead.qualificationState} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}