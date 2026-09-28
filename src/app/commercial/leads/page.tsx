import Link from "next/link";
import { getLeads } from "@/lib/commercial/actions";
import styles from "./page.module.css";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(value);
}

const GROUPS = [
  {
    key: "NEW",
    label: "New Leads",
    description: "New opportunities waiting to be contacted.",
    tone: "new",
  },
  {
    key: "FOLLOW_UP",
    label: "Follow-ups",
    description: "Leads currently being contacted or qualified.",
    tone: "followup",
  },
  {
    key: "PROSPECT",
    label: "Prospects",
    description: "Qualified commercial opportunities.",
    tone: "prospect",
  },
  {
    key: "CUSTOMER",
    label: "Customers",
    description: "Leads that have been converted into customers.",
    tone: "customer",
  },
  {
    key: "LOST",
    label: "Lost",
    description: "Opportunities that were lost.",
    tone: "lost",
  },
  {
    key: "UNQUALIFIED",
    label: "Unqualified",
    description: "Leads that did not meet qualification requirements.",
    tone: "unqualified",
  },
  {
    key: "NOT_INTERESTED",
    label: "Not Interested",
    description: "Leads that declined or are not interested.",
    tone: "notinterested",
  },
] as const;

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

export default async function LeadsPage() {
  const leads = await getLeads();

  const groupedLeads = new Map(
    GROUPS.map((group) => [
      group.key,
      leads.filter((lead) => lead.status === group.key),
    ]),
  );

  return (
    <div className={styles.page}>
      <Link href="/commercial" className={styles.back}>
        ← Commercial
      </Link>

      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>COMMERCIAL PIPELINE</div>
          <h1 className={styles.title}>Leads</h1>
          <p className={styles.subtitle}>
            Every commercial opportunity, organized by its current lifecycle
            stage.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link href="/commercial/leads/list" className={styles.primaryButton}>
            View as sheet
          </Link>
          <Link href="/commercial/leads/new" className={styles.primaryButton}>
            + New Lead
          </Link>
        </div>
      </header>

      <section className={styles.overview}>
        <div className={styles.overviewTitle}>Pipeline overview</div>

        <div className={styles.overviewGrid}>
          {GROUPS.map((group) => {
            const count = groupedLeads.get(group.key)?.length ?? 0;

            return (
              <a
                key={group.key}
                href={`#${group.key.toLowerCase()}`}
                className={styles.overviewItem}
              >
                <span
                  className={styles.overviewDot}
                  data-tone={group.tone}
                />
                <span className={styles.overviewLabel}>
                  {group.label}
                </span>
                <strong>{count}</strong>
              </a>
            );
          })}
        </div>
      </section>

      <div className={styles.groups}>
        {GROUPS.map((group) => {
          const groupLeads = groupedLeads.get(group.key) ?? [];

          return (
            <section
              key={group.key}
              id={group.key.toLowerCase()}
              className={styles.group}
            >
              <div className={styles.groupHeader}>
                <div className={styles.groupHeading}>
                  <span
                    className={styles.groupDot}
                    data-tone={group.tone}
                  />

                  <div>
                    <h2 className={styles.groupTitle}>
                      {group.label}
                    </h2>
                    <p className={styles.groupDescription}>
                      {group.description}
                    </p>
                  </div>
                </div>

                <div className={styles.groupCount}>
                  {groupLeads.length}
                </div>
              </div>

              {groupLeads.length === 0 ? (
                <div className={styles.emptyGroup}>
                  No {group.label.toLowerCase()} at the moment.
                </div>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Contact</th>
                        <th>Product</th>
                        <th>Source</th>
                        <th>Quotes</th>
                        <th>Created</th>
                        <th />
                      </tr>
                    </thead>

                    <tbody>
                      {groupLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <Link
                              href={`/commercial/leads/${lead.id}`}
                              className={styles.leadLink}
                            >
                              <span className={styles.leadName}>
                                {lead.companyName}
                              </span>

                              <span className={styles.reference}>
                                {lead.referenceNumber}
                              </span>
                            </Link>
                          </td>

                          <td>
                            <div className={styles.contact}>
                              <span>
                                {lead.contactPerson ?? "No contact name"}
                              </span>

                              {lead.phone && (
                                <span className={styles.muted}>
                                  {lead.phone}
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            {lead.productInterest
                              ? lead.productInterest.replaceAll("_", " ")
                              : "—"}
                          </td>

                          <td>
                            {lead.source.replaceAll("_", " ")}
                          </td>

                          <td>
                            <span className={styles.quoteCount}>
                              {lead.quoteRequests.length}
                            </span>
                          </td>

                          <td className={styles.date}>
                            {formatDate(lead.createdAt)}
                          </td>

                          <td>
                            <Link
                              href={`/commercial/leads/${lead.id}`}
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
          );
        })}
      </div>
    </div>
  );
}