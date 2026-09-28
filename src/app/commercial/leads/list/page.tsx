import Link from "next/link";
import { getLeads } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(value);
}

function statusLabel(status: string) {
  switch (status) {
    case "NEW":
      return "New";
    case "FOLLOW_UP":
      return "Follow-up";
    case "PROSPECT":
      return "Prospect";
    case "CUSTOMER":
      return "Customer";
    case "LOST":
      return "Lost";
    case "UNQUALIFIED":
      return "Unqualified";
    case "NOT_INTERESTED":
      return "Not Interested";
    default:
      return status.replaceAll("_", " ");
  }
}

export default async function LeadsListPage() {
  const leads = await getLeads();

  return (
    <div className={styles.page}>
      <Link href="/commercial/leads" className={styles.back}>
        ← Leads
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL PIPELINE</div>
          <h1 className={styles.title}>All Leads</h1>
          <p className={styles.subtitle}>
            Every lead in one sheet — organization, contact, need, and next action.
          </p>
        </div>
        <Link href="/commercial/leads/new" className={styles.primaryButton}>
          + New Lead
        </Link>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Contact Person</th>
              <th>Role</th>
              <th>Business Need</th>
              <th>Product of Interest</th>
              <th>Date of Engagement</th>
              <th>Follow-up Status</th>
              <th>Next Action</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link href={`/commercial/leads/${lead.id}`} className={styles.leadLink}>
                    {lead.companyName}
                  </Link>
                </td>
                <td>{lead.contactPerson ?? "—"}</td>
                <td>{lead.role ?? "—"}</td>
                <td className={styles.wrapCell}>{lead.businessNeed ?? "—"}</td>
                <td>
                  {lead.productInterest ? lead.productInterest.replaceAll("_", " ") : "—"}
                </td>
                <td className={styles.date}>{formatDate(lead.createdAt)}</td>
                <td>
                  <span className={styles.statusBadge} data-status={lead.status}>
                    {statusLabel(lead.status)}
                  </span>
                </td>
                <td className={styles.wrapCell}>{lead.nextAction ?? "—"}</td>
                <td>
                  <Link href={`/commercial/leads/${lead.id}`} className={styles.viewLink}>
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}