"use client";

import { useEffect, useState } from "react";

type ZohoCustomer = {
  contactId: string;
  contactName: string;
  companyName: string;
  phone: string;
  email: string;
};

type ZohoCustomerSelectProps = {
  name: string;
  required?: boolean;
  disabled?: boolean;
};

export function ZohoCustomerSelect({
  name,
  required = false,
  disabled = false,
}: ZohoCustomerSelectProps) {
  const [customers, setCustomers] = useState<ZohoCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/zoho/customers", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Unable to load Zoho Books customers.",
          );
        }

        if (!cancelled) {
          setCustomers(
            Array.isArray(data.customers) ? data.customers : [],
          );
        }
      } catch (err) {
        console.error(
          "[ZohoCustomerSelect] Customer loading failed:",
          err,
        );

        if (!cancelled) {
          setCustomers([]);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load Zoho Books customers.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCustomer = customers.find(
    (customer) => customer.contactId === selectedCustomerId,
  );

  return (
    <>
      <select
        id={name}
        name={name}
        value={selectedCustomerId}
        onChange={(event) =>
          setSelectedCustomerId(event.target.value)
        }
        required={required}
        disabled={disabled || isLoading}
        style={{
          width: "100%",
          minHeight: "42px",
          padding: "9px 12px",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          background: "var(--card)",
          color: "var(--ink)",
        }}
      >
        <option value="">
          {isLoading ? "Loading customers…" : "Choose customer"}
        </option>

        {!isLoading &&
          customers.map((customer) => {
            const displayName =
              customer.companyName ||
              customer.contactName ||
              "Unnamed customer";

            return (
              <option
                key={customer.contactId}
                value={customer.contactId}
              >
                {displayName}
              </option>
            );
          })}
      </select>

      <input
        type="hidden"
        name="customerName"
        value={
          selectedCustomer
            ? selectedCustomer.companyName ||
              selectedCustomer.contactName
            : ""
        }
        readOnly
      />

      {selectedCustomer ? (
        <div
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "var(--grey-600)",
          }}
        >
          Zoho customer ID: {selectedCustomer.contactId}
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          style={{
            marginTop: "8px",
            fontSize: "12px",
            color: "var(--danger, #b42318)",
          }}
        >
          {error}
        </p>
      ) : null}
    </>
  );
}