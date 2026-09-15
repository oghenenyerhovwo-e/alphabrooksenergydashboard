import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuoteRequestDetail } from "@/lib/commercial/actions";
import { QuoteRequestQualificationPanel } from "@/components/commercial/QuoteRequestQualificationPanel";
import styles from "../../leads/[id]/page.module.css";

interface QuoteRequestDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function QuoteRequestDetailPage({
  params,
}: QuoteRequestDetailPageProps) {
  const { id } = await params;

  const quoteRequest = await getQuoteRequestDetail(id);

  if (!quoteRequest) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Link href="/commercial/quote-requests" className={styles.back}>
        ← Quote Requests
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>QUOTE REQUEST</div>

          <h1 className={styles.title}>
            {quoteRequest.referenceNumber}
          </h1>

          <p className={styles.subtitle}>
            For{" "}
            <Link href={`/commercial/leads/${quoteRequest.lead.id}`}>
              {quoteRequest.lead.companyName}
            </Link>{" "}
            · Created {formatDate(quoteRequest.createdAt)}
          </p>
        </div>

        <div className={styles.headerBadges}>
          <span
            className={styles.badge}
            data-tone={quoteRequest.qualificationState}
          >
            {quoteRequest.qualificationState}
          </span>

          <span
            className={styles.statusPill}
            data-status={quoteRequest.status}
          >
            {quoteRequest.status}
          </span>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Request Details</h2>

              <Link
                href={`/commercial/quote-requests/${quoteRequest.id}/edit`}
                className={styles.editLink}
              >
                Edit
              </Link>
            </div>

            <div className={styles.detailGrid}>
              <Detail
                label="Requested product"
                value={quoteRequest.requestedProduct.replace("_", " ")}
              />

              <Detail
                label="Requested quantity"
                value={
                  quoteRequest.requestedQuantity
                    ? `${quoteRequest.requestedQuantity} ${
                        quoteRequest.unit ?? ""
                      }`
                    : "—"
                }
              />

              <Detail
                label="Delivery location"
                value={quoteRequest.deliveryLocation ?? "—"}
              />

              <Detail
                label="Requested delivery date"
                value={formatDate(quoteRequest.requestedDeliveryDate)}
              />

              <Detail
                label="Created by"
                value={quoteRequest.createdBy.name}
              />

              <Detail
                label="Qualified by"
                value={
                  quoteRequest.qualifiedBy
                    ? quoteRequest.qualifiedBy.name
                    : "—"
                }
              />
            </div>

            {quoteRequest.description && (
              <div className={styles.notesBlock}>
                <div className={styles.detailLabel}>Description</div>

                <p className={styles.notesText}>
                  {quoteRequest.description}
                </p>
              </div>
            )}

            {quoteRequest.notes && (
              <div className={styles.notesBlock}>
                <div className={styles.detailLabel}>Notes</div>

                <p className={styles.notesText}>{quoteRequest.notes}</p>
              </div>
            )}

            {quoteRequest.qualificationReason && (
              <div className={styles.notesBlock}>
                <div className={styles.detailLabel}>
                  Qualification reason
                </div>

                <p className={styles.notesText}>
                  {quoteRequest.qualificationReason}
                </p>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Audit History</h2>

            {quoteRequest.auditLogs.length === 0 ? (
              <p className={styles.muted}>
                No audit events recorded.
              </p>
            ) : (
              <div className={styles.timeline}>
                {quoteRequest.auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className={styles.timelineItem}
                  >
                    <div className={styles.timelineAction}>
                      {log.action}
                    </div>

                    <div className={styles.timelineDetails}>
                      {log.details ?? "No additional details."}
                    </div>

                    <div className={styles.timelineMeta}>
                      {log.actorName} · {log.actorRole} ·{" "}
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={styles.sideColumn}>
          <QuoteRequestQualificationPanel
            quoteRequestId={quoteRequest.id}
            qualificationState={quoteRequest.qualificationState}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.detail}>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}