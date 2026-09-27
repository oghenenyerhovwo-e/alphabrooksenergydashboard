import Link from "next/link";
import { notFound } from "next/navigation";
import { getInternalOrderDetail } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function InternalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await getInternalOrderDetail(id);

  if (!order) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <Link href="/commercial/orders" className={styles.back}>
        ← Orders
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL ORDER</div>

          <h1 className={styles.title}>
            {order.referenceNumber}
          </h1>

          <p className={styles.subtitle}>
            Created {formatDate(order.createdAt)}
          </p>
        </div>

        <span className={styles.status}>
          Internal Order
        </span>
      </header>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardTitle}>
            Customer
          </div>

          <div className={styles.customer}>
            <strong>{order.customerName}</strong>

            <span>
              Zoho Customer ID: {order.zohoCustomerId}
            </span>

            {order.customerReference && (
              <span>
                Customer reference: {order.customerReference}
              </span>
            )}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>
            Order Details
          </div>

          <dl className={styles.details}>
            <div>
              <dt>Product</dt>
              <dd>{order.product.replaceAll("_", " ")}</dd>
            </div>

            <div>
              <dt>Quantity</dt>
              <dd>
                {order.quantity.toLocaleString("en-NG")}
              </dd>
            </div>

            <div>
              <dt>Delivery Location</dt>
              <dd>{order.deliveryLocation}</dd>
            </div>

            <div>
              <dt>Created By</dt>
              <dd>{order.createdBy.name}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>
            Notes
          </div>

          <div className={styles.notes}>
            {order.notes || "No notes were recorded for this order."}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardTitle}>
            Commercial Workflow
          </div>

          <div className={styles.workflow}>
            <div className={styles.workflowStep}>
              <span className={styles.stepActive}>1</span>
              <div>
                <strong>Order Created</strong>
                <span>
                  Customer purchase has been recorded.
                </span>
              </div>
            </div>

            <div className={styles.workflowLine} />

            <div className={styles.workflowStep}>
              <span className={styles.step}>2</span>
              <div>
                <strong>Profitability Review</strong>
                <span>
                  Sales reviews commercial viability.
                </span>
              </div>
            </div>

            <div className={styles.workflowLine} />

            <div className={styles.workflowStep}>
              <span className={styles.step}>3</span>
              <div>
                <strong>Fulfilment</strong>
                <span>
                  Operations handles delivery execution.
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}