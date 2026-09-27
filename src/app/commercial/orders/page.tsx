import Link from "next/link";
import { getInternalOrders } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatProduct(value: string) {
  return value.replaceAll("_", " ");
}

export default async function OrdersPage() {
  const orders = await getInternalOrders();

  return (
    <div className={styles.page}>
      <Link href="/commercial" className={styles.back}>
        ← Commercial
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL</div>

          <h1 className={styles.title}>Orders</h1>

          <p className={styles.subtitle}>
            Customer orders recorded by the commercial team.
          </p>
        </div>

        <Link
          href="/commercial/orders/new"
          className={styles.primaryButton}
        >
          + New Order
        </Link>
      </header>

      <section className={styles.summary}>
        <div>
          <span className={styles.summaryLabel}>TOTAL ORDERS</span>
          <strong className={styles.summaryValue}>
            {orders.length}
          </strong>
        </div>

        <div>
          <span className={styles.summaryLabel}>THIS YEAR</span>
          <strong className={styles.summaryValue}>
            {
              orders.filter(
                (order) =>
                  order.createdAt.getFullYear() ===
                  new Date().getFullYear(),
              ).length
            }
          </strong>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h2>All Orders</h2>
            <p>
              Every internal customer order currently recorded in
              Alpha Brooks.
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>
              No orders yet
            </div>

            <p>
              Once a customer places an order, create it here.
            </p>

            <Link
              href="/commercial/orders/new"
              className={styles.secondaryButton}
            >
              Create first order
            </Link>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Delivery</th>
                  <th>Created</th>
                  <th>Created by</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link
                        href={`/commercial/orders/${order.id}`}
                        className={styles.orderLink}
                      >
                        {order.referenceNumber}
                      </Link>
                    </td>

                    <td>
                      <strong className={styles.customerName}>
                        {order.customerName}
                      </strong>

                      {order.customerReference && (
                        <span className={styles.muted}>
                          Ref: {order.customerReference}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={styles.productBadge}>
                        {formatProduct(order.product)}
                      </span>
                    </td>

                    <td className={styles.quantity}>
                      {order.quantity.toLocaleString("en-NG")}
                    </td>

                    <td>{order.deliveryLocation}</td>

                    <td className={styles.date}>
                      {formatDate(order.createdAt)}
                    </td>

                    <td>
                      <span className={styles.createdBy}>
                        {order.createdBy.name}
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/commercial/orders/${order.id}`}
                        className={styles.viewLink}
                      >
                        View →
                      </Link>
                    </td>
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