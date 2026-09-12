import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeliveryDetail } from "@/lib/delivery/actions";
import { getDeliveryStatusGroup } from "@/lib/delivery/statusGroup";
import { DeliveryNoteActions } from "@/components/operations/DeliveryNoteActions";
import styles from "./page.module.css";

interface DeliveryNotePageProps {
  params: Promise<{ id: string }>;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value);
}

function formatTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", { timeStyle: "short" }).format(value);
}

function productLabel(product: string) {
  return product
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DeliveryNotePage({ params }: DeliveryNotePageProps) {
  const { id } = await params;
  const delivery = await getDeliveryDetail(id);

  if (!delivery) {
    notFound();
  }

  // TODO(Phase 3): once src/lib/delivery/statusGroup.ts exists, swap this for
  // getDeliveryStatusGroup(delivery.status) === "COMPLETED".
    const isCompleted = getDeliveryStatusGroup(delivery.status) === "COMPLETED";

  if (!isCompleted) {
    return (
      <div className={styles.page}>
        <div className={styles.notReady}>
          <p>This delivery note isn&apos;t available yet.</p>
          <p className={styles.notReadySub}>
            Delivery {delivery.deliveryNoteNumber} is currently{" "}
            {delivery.status.replace(/_/g, " ").toLowerCase()}. The note can be
            generated once the delivery is completed.
          </p>
          <Link href={`/operations/deliveries/${delivery.id}`} className={styles.backLink}>
            ← Back to delivery
          </Link>
        </div>
      </div>
    );
  }

  const representativeName = delivery.driver?.name ?? "—";
  const receiverName = delivery.receiverName ?? "—";
  const acknowledgementName = receiverName !== "—" ? receiverName : representativeName;
  const completionDate = delivery.arrivalAt ?? delivery.updatedAt;

  return (
    <div className={styles.page}>
      <div className={styles.screenOnlyActions}>
        <Link href={`/operations/deliveries/${delivery.id}`} className={styles.backLink}>
          ← Back to delivery
        </Link>

        <DeliveryNoteActions deliveryId={delivery.id} contactEmail={delivery.contactEmail} />
      </div>

      <div id="delivery-note-printable" className={styles.note}>
        <header className={styles.noteHeader}>
          <div>
            <div className={styles.brandName}>Alpha Brooks Energy</div>
            <div className={styles.brandSub}>Delivery Operations</div>
          </div>

          <div className={styles.noteNumberBlock}>
            <div className={styles.noteNumberLabel}>Delivery Note No.</div>
            <div className={styles.noteNumber}>{delivery.deliveryNoteNumber}</div>
          </div>
        </header>

        <h1 className={styles.title}>Delivery Acknowledgement</h1>

        <p className={styles.dateLine}>Date: {formatDate(completionDate)}</p>

        <p className={styles.paragraph}>
          I, <strong>{acknowledgementName}</strong>, with contact number{" "}
          <strong>{delivery.receiverPhone ?? "—"}</strong>, hereby acknowledge that{" "}
          <strong>
            {delivery.quantityDelivered ?? "—"} {delivery.unit}
          </strong>{" "}
          of <strong>{productLabel(delivery.product)}</strong> was received in favor of{" "}
          <strong>{delivery.customer}</strong> located at{" "}
          <strong>{delivery.deliveryAddress}</strong>.
        </p>

        <p className={styles.paragraph}>
          on <strong>{formatDate(completionDate)}</strong> at{" "}
          <strong>{formatTime(completionDate)}</strong>.
        </p>

        <p className={styles.acknowledgement}>
          By signing below, both parties confirm that the quantity stated above
          was received in good condition and without discrepancy, save for any
          remarks separately recorded against this delivery.
        </p>

        <div className={styles.signatureGrid}>
          <div className={styles.signatureBlock}>
            <div className={styles.signatureBlockTitle}>Alpha Brooks Representative</div>

            <div className={styles.signatureRow}>
              <span className={styles.signatureLabel}>Name</span>
              <span className={styles.signatureValue}>{representativeName}</span>
            </div>

            <div className={styles.signatureImageWrap}>
              {delivery.driverSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={delivery.driverSignatureUrl}
                  alt="Alpha Brooks representative signature"
                  className={styles.signatureImage}
                />
              ) : (
                <span className={styles.signatureMissing}>No signature on file</span>
              )}
            </div>

            <div className={styles.signatureRow}>
              <span className={styles.signatureLabel}>Date</span>
              <span className={styles.signatureValue}>{formatDate(completionDate)}</span>
            </div>
          </div>

          <div className={styles.signatureBlock}>
            <div className={styles.signatureBlockTitle}>Retailer&apos;s Representative</div>

            <div className={styles.signatureRow}>
              <span className={styles.signatureLabel}>Name</span>
              <span className={styles.signatureValue}>{receiverName}</span>
            </div>

            <div className={styles.signatureImageWrap}>
              {delivery.receiverSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={delivery.receiverSignatureUrl}
                  alt="Retailer's representative signature"
                  className={styles.signatureImage}
                />
              ) : (
                <span className={styles.signatureMissing}>No signature on file</span>
              )}
            </div>

            <div className={styles.signatureRow}>
              <span className={styles.signatureLabel}>Date</span>
              <span className={styles.signatureValue}>{formatDate(completionDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}