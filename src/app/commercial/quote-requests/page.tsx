import Link from "next/link";

import { getQuoteRequests } from "@/lib/commercial/actions";

export default async function QuoteRequestsPage() {
  const quoteRequests = await getQuoteRequests();

  return (
    <main>
      <header>
        <div>
          <p>Commercial</p>
          <h1>Quote Requests</h1>
          <p>
            Review and manage customer quote requests submitted through the
            commercial workflow.
          </p>
        </div>

        <Link href="/commercial/leads">View Leads</Link>
      </header>

      <section>
        {quoteRequests.length === 0 ? (
          <div>
            <h2>No quote requests yet</h2>
            <p>
              Quote requests will appear here when they are created from the
              commercial workflow.
            </p>
          </div>
        ) : (
          <div>
            {quoteRequests.map((quoteRequest) => (
              <article key={quoteRequest.id}>
                <Link
                  href={`/commercial/quote-requests/${quoteRequest.id}`}
                >
                  <h2>
                    {quoteRequest.referenceNumber ??
                      `Quote Request ${quoteRequest.id}`}
                  </h2>
                </Link>

                <p>
                  Status:{" "}
                  <strong>{quoteRequest.status}</strong>
                </p>

                {"createdAt" in quoteRequest && quoteRequest.createdAt ? (
                  <p>
                    Created:{" "}
                    {new Date(quoteRequest.createdAt).toLocaleDateString()}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}