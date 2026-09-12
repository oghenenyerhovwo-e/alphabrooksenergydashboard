import Link from "next/link";

import {
  getInTransitDeliveries,
} from "@/lib/delivery/execution-actions";

export default async function InTransitDeliveriesPage() {
  const deliveries =
    await getInTransitDeliveries();

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <Link
          href="/operations/deliveries"
          className="text-sm text-gray-500 hover:text-black"
        >
          ← Back to Deliveries
        </Link>

        <h1 className="mt-2 text-2xl font-bold">
          Deliveries In Transit
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Monitor deliveries that have left the
          loading point and have not yet been completed.
        </p>
      </div>

      <div className="rounded-xl border">
        {deliveries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">
              No deliveries are currently in transit.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Active deliveries will appear here once
              they are started.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {deliveries.map((delivery) => (
              <Link
                key={delivery.id}
                href={`/operations/deliveries/${delivery.id}/execution`}
                className="block p-5 transition hover:bg-gray-50"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div>
                    <p className="text-sm font-semibold">
                      {delivery.deliveryNoteNumber}
                    </p>

                    <h2 className="mt-1 font-semibold">
                      {delivery.customer}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {delivery.destination}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    <Metric
                      label="Driver"
                      value={
                        delivery.driver?.name ??
                        "Unassigned"
                      }
                    />

                    <Metric
                      label="Vehicle"
                      value={
                        delivery.vehicle
                          ?.plateNumber ??
                        "Unassigned"
                      }
                    />

                    <Metric
                      label="Product"
                      value={delivery.product}
                    />

                    <Metric
                      label="Departure"
                      value={
                        delivery.departureAt
                          ? delivery.departureAt.toLocaleTimeString()
                          : "—"
                      }
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium">
        {value}
      </p>
    </div>
  );
}